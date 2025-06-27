import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Star, Search, X, ChevronDown, ChevronUp, BookOpen, CheckCircle, Target, User, Lightbulb, Loader2, KeyRound, Link as LinkIcon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc,
    query,
    setLogLevel
} from 'firebase/firestore';

// ===================================================================================
// === CONFIGURATION =================================================================
// ===================================================================================
// These variables are now read securely from your Netlify Environment Variables.
// Go to your Netlify Site -> Site settings -> Build & deploy -> Environment
// ===================================================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const SHARED_PASSWORD = import.meta.env.VITE_SHARED_PASSWORD;

// ===================================================================================

// --- Helper Components ---

const RatingStars = ({ rating, onRatingChange, readOnly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const totalStars = 3;

  return (
    <div className="flex items-center">
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={starValue}
            className={`w-5 h-5 cursor-pointer transition-colors ${
              (hoverRating || rating) >= starValue ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            onClick={() => !readOnly && onRatingChange(starValue)}
            onMouseEnter={() => !readOnly && setHoverRating(starValue)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
          />
        );
      })}
    </div>
  );
};

// --- Main Application ---

const App = () => {
  // --- Firebase and Auth State ---
  const [db, setDb] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- App State ---
  const [literature, setLiterature] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'relevance', direction: 'descending' });
  const [statusFilter, setStatusFilter] = useState('All');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const encouragingMessages = [
    "Welcome Back, Champ!", "Read something interesting lately?", "Don't forget to grab your lunch!",
    "Let's uncover some new insights today!", "Every paper is a step forward. Let's get reading!",
    "New day, new knowledge. What will we find?", "Keep up the great work, the project is looking good!"
  ];

  // --- Firebase Initialization and Auth Effect ---
  useEffect(() => {
    if (!firebaseConfig.apiKey) {
        console.error("Firebase config is not set. Check your Netlify environment variables.");
        setIsLoading(false);
        return;
    }
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestoreDb = getFirestore(app);
    setDb(firestoreDb);
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            setIsAuthReady(true);
        } else {
            try { await signInAnonymously(auth); } catch (error) { console.error(error); }
        }
    });
    setWelcomeMessage(encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]);
  }, []);

  // --- Firestore Data Fetching Effect ---
  useEffect(() => {
    if (db && isAuthReady) {
      const literatureCollection = collection(db, 'literature');
      const q = query(literatureCollection);
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const literatureData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLiterature(literatureData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching data: ", error);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [db, isAuthReady]);


  // --- Data Filtering and Sorting ---
  const filteredAndSortedLiterature = useMemo(() => {
    let sortedLiterature = [...literature];
    if (statusFilter !== 'All') sortedLiterature = sortedLiterature.filter(item => item.status === statusFilter);
    if (searchTerm) {
      sortedLiterature = sortedLiterature.filter(item =>
        Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (sortConfig.key !== null) {
      sortedLiterature.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortedLiterature;
  }, [literature, searchTerm, sortConfig, statusFilter]);
  
  // --- UI Handlers ---
  const handleSort = (key) => {
    setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' }));
  };
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronDown className="w-4 h-4 text-gray-400 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  }
  const openModal = (entry = null) => { setEditingEntry(entry); setIsModalOpen(true); };
  const closeModal = () => { setEditingEntry(null); setIsModalOpen(false); };
  const openDeleteConfirm = (id) => setShowDeleteConfirm(id);
  const closeDeleteConfirm = () => setShowDeleteConfirm(null);

  // --- Firestore CRUD Operations ---
  const handleSave = useCallback(async (entryData) => {
    if (!db) return;
    try {
      if (editingEntry) { await updateDoc(doc(db, 'literature', editingEntry.id), entryData); } 
      else { await addDoc(collection(db, 'literature'), entryData); }
      closeModal();
    } catch (error) { console.error("Error saving document: ", error); }
  }, [db, editingEntry]);
  const handleDelete = useCallback(async (id) => {
    if (!db || !id) return;
    try { await deleteDoc(doc(db, 'literature', id)); closeDeleteConfirm(); } 
    catch(error) { console.error("Error deleting document: ", error); closeDeleteConfirm(); }
  }, [db]);
  const handleStatusChange = useCallback(async (id, newStatus) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'literature', id), { status: newStatus }); } 
    catch(error) { console.error("Error updating status: ", error); }
  }, [db]);

  // --- Render ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="ml-4 text-xl text-gray-700">Connecting to Database...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900">Literature Review Manager</h1>
            <p className="mt-2 text-lg text-gray-600">Kajima Project 2025-2027</p>
            <p className="mt-3 text-md text-blue-600 font-semibold">{welcomeMessage}</p>
        </div>
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="relative md:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search literature..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     {searchTerm && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
                </div>
                 <div className="md:col-span-1 flex items-center justify-center space-x-2">
                    <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Filter:</label>
                    <select id="status-filter" className="border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option>All</option><option>To Read</option><option>Reading</option><option>Completed</option><option>Suggested for Benchmark</option><option>Benchmark</option>
                    </select>
                </div>
                <div className="md:col-span-1 flex justify-end">
                    <button onClick={() => openModal()} className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:scale-105">
                        <Plus className="w-5 h-5" /> Add Literature
                    </button>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 w-1/5 cursor-pointer" onClick={() => handleSort('title')}><div className="flex items-center">Title {getSortIcon('title')}</div></th>
                <th scope="col" className="px-4 py-3 w-1/6 cursor-pointer" onClick={() => handleSort('authors')}><div className="flex items-center">Authors {getSortIcon('authors')}</div></th>
                <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('year')}><div className="flex items-center">Year {getSortIcon('year')}</div></th>
                <th scope="col" className="px-4 py-3 w-1/5">Summary</th>
                <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('relevance')}><div className="flex items-center">Relevance {getSortIcon('relevance')}</div></th>
                <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('status')}><div className="flex items-center">Status {getSortIcon('status')}</div></th>
                <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('pic')}><div className="flex items-center">PIC {getSortIcon('pic')}</div></th>
                <th scope="col" className="px-4 py-3 text-center">Link</th>
                <th scope="col" className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedLiterature.map((item) => (
                <tr key={item.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-900">{item.title}</td>
                  <td className="px-4 py-4 text-gray-600">{item.authors}</td>
                  <td className="px-4 py-4">{item.year}</td>
                  <td className="px-4 py-4 text-xs">{item.summary}</td>
                  <td className="px-4 py-4"><RatingStars rating={item.relevance} readOnly={true} /></td>
                  <td className="px-4 py-4">
                     <select value={item.status} onChange={(e) => handleStatusChange(item.id, e.target.value)} className="border-none bg-transparent rounded-lg p-1 focus:ring-1 focus:ring-blue-500">
                        <option>To Read</option><option>Reading</option><option>Completed</option><option>Suggested for Benchmark</option><option>Benchmark</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">{item.pic}</td>
                  <td className="px-4 py-4 text-center">
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors inline-block">
                        <LinkIcon className="w-5 h-5" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center space-x-3">
                        <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => openDeleteConfirm(item.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
           {filteredAndSortedLiterature.length === 0 && !isLoading && (
              <div className="text-center py-16">
                  <h3 className="text-xl font-semibold text-gray-700">No Literature Found</h3>
                  <p className="text-gray-500 mt-2">Start by adding your first research paper!</p>
              </div>
          )}
        </div>
      </div>
      {isModalOpen && <LiteratureModal entry={editingEntry} onSave={handleSave} onClose={closeModal} />}
      {showDeleteConfirm && <DeleteConfirmModal onConfirm={() => handleDelete(showDeleteConfirm)} onCancel={closeDeleteConfirm}/>}
    </div>
  );
};


// --- Modal Components ---
const LiteratureModal = ({ entry, onSave, onClose }) => {
    const picOptions = ["Alba", "Favio", "Okada", "Otchia", "Ishikawa", "Seiki"];
    const statusOptions = ["To Read", "Reading", "Completed", "Suggested for Benchmark", "Benchmark"];
    const [formData, setFormData] = useState({
        title: '', authors: '', year: new Date().getFullYear(), publication: '',
        topic: '', data: '', unitOfObservations: '', pic: picOptions[0],
        summary: '', findings: '', method: '', contributions: '',
        relevance: 2, status: statusOptions[0], link: ''
    });
    useEffect(() => { if (entry) setFormData(entry) }, [entry]);
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
    };
    const handleRatingChange = (newRating) => setFormData(prev => ({ ...prev, relevance: newRating }));
    const handleSubmit = (e) => {
        e.preventDefault();
        const { id, ...dataToSave } = formData;
        onSave(dataToSave);
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">{entry ? 'Edit Literature' : 'Add New Literature'}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button></div>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <div className="lg:col-span-2"><label htmlFor="title" className="label">Title</label><input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="form-input" required /></div>
                        <div><label htmlFor="year" className="label">Year</label><input type="number" name="year" id="year" value={formData.year} onChange={handleChange} className="form-input" required /></div>
                        <div className="lg:col-span-2"><label htmlFor="authors" className="label">Authors</label><input type="text" name="authors" id="authors" value={formData.authors} onChange={handleChange} className="form-input" required /></div>
                        <div><label htmlFor="publication" className="label">Journal / Conference</label><input type="text" name="publication" id="publication" value={formData.publication} onChange={handleChange} className="form-input" /></div>
                        
                        <div className="lg:col-span-3">
                           <label htmlFor="link" className="label">Article Link</label>
                           <input type="url" name="link" id="link" value={formData.link} placeholder="https://..." onChange={handleChange} className="form-input" />
                        </div>

                        <hr className="lg:col-span-3 my-2"/>

                        <div><label htmlFor="topic" className="label">Topic</label><input type="text" name="topic" id="topic" value={formData.topic} onChange={handleChange} className="form-input" /></div>
                        <div><label htmlFor="data" className="label">Data Source</label><input type="text" name="data" id="data" value={formData.data} onChange={handleChange} className="form-input" /></div>
                        <div><label htmlFor="unitOfObservations" className="label">Unit of Observations</label><input type="text" name="unitOfObservations" id="unitOfObservations" value={formData.unitOfObservations} onChange={handleChange} className="form-input" /></div>
                        
                        <hr className="lg:col-span-3 my-2"/>

                        <div className="lg:col-span-3"><label htmlFor="summary" className="label">Summary</label><textarea name="summary" id="summary" rows="3" value={formData.summary} onChange={handleChange} className="form-textarea"></textarea></div>
                        
                        <hr className="lg:col-span-3 my-2"/>

                        <div><label htmlFor="status" className="label">Status</label><select name="status" id="status" value={formData.status} onChange={handleChange} className="form-input">{statusOptions.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="label">Relevance Score</label><RatingStars rating={formData.relevance} onRatingChange={handleRatingChange} /></div>
                        <div><label htmlFor="pic" className="label">Person In Charge (PIC)</label><select name="pic" id="pic" value={formData.pic} onChange={handleChange} className="form-input">{picOptions.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                    </div>
                    <div className="p-6 bg-gray-50 border-t flex justify-end items-center space-x-4"><button type="button" onClick={onClose} className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100">Cancel</button><button type="submit" className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700">Save</button></div>
                </form>
            </div>
        </div>
    );
};
const DeleteConfirmModal = ({ onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"><div className="p-8 text-center"><Trash2 className="w-16 h-16 text-red-500 mx-auto mb-4"/><h3 className="text-xl font-bold text-gray-800">Are you sure?</h3><p className="text-gray-600 mt-2">Do you really want to delete this entry? This process cannot be undone.</p></div><div className="p-4 bg-gray-50 flex justify-center items-center space-x-4 rounded-b-2xl"><button onClick={onCancel} className="bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-semibold">Cancel</button><button onClick={onConfirm} className="bg-red-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-red-700">Delete</button></div></div>
        </div>
    )
}

const PasswordGate = ({ onAuthenticated }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === SHARED_PASSWORD) {
            onAuthenticated(true);
            sessionStorage.setItem('isAuthenticated', 'true');
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col justify-center items-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <KeyRound className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Required</h1>
                <p className="text-gray-600 mb-6">Please enter the password to access the Literature Manager.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className="form-input w-full text-center"
                        placeholder="Enter password"
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Enter
                    </button>
                </form>
            </div>
        </div>
    );
}


const GlobalStyles = () => (<style jsx global>{`.label{display:block;margin-bottom:.25rem;font-size:.875rem;font-weight:500;color:#374151}.form-input,.form-textarea{display:block;width:100%;padding:.5rem .75rem;font-size:1rem;color:#333;border:1px solid #d1d5db;border-radius:.5rem;transition:all .15s ease-in-out}.form-input:focus,.form-textarea:focus{outline:0;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.25)}`}</style>);

// The AppWrapper now manages the password authentication state
const AppWrapper = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        sessionStorage.getItem('isAuthenticated') === 'true'
    );

    if (!isAuthenticated) {
        return <PasswordGate onAuthenticated={setIsAuthenticated} />;
    }
    
    return (
        <>
            <GlobalStyles />
            <App />
        </>
    );
}

export default AppWrapper;
