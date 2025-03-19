import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import confetti from 'canvas-confetti'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faFileInvoice, 
  faBarcode,
  faRightFromBracket,
  faFileExcel,
  faSortAmountDown,
  faSortAmountUp
} from '@fortawesome/free-solid-svg-icons'
import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx'
import './App.css'

// URL du serveur backend
const API_URL = "http://192.168.1.51:3002" || import.meta.env.VITE_API_URL;

// Fonction pour vérifier si le serveur est disponible
const checkServerConnection = async () => {
  try {
    // Utiliser une route qui n'a pas besoin de paramètres
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Erreur de connexion au serveur:', error);
    return false;
  }
};

function App() {
  const [code1, setCode1] = useState('')
  const [code2, setCode2] = useState('')
  const [startingCode, setStartingCode] = useState('document')
  const [scanning, setScanning] = useState(false)
  const [scanningFor, setScanningFor] = useState(1)
  const [result, setResult] = useState('')
  const [lastScanResult, setLastScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [history, setHistory] = useState([])
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [currentView, setCurrentView] = useState('scan')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState('normal')
  const [isAdmin, setIsAdmin] = useState(false);
  const [allScans, setAllScans] = useState([]);
  const [users, setUsers] = useState([]);
  const [adminView, setAdminView] = useState('scans'); // 'scans' ou 'users'
  const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ userId: null, newPassword: '' });
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterMatch, setFilterMatch] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [searchQuery, setSearchQuery] = useState(''); // Nouveau state pour la recherche
  const [searchField, setSearchField] = useState('all'); // Nouveau state pour le champ de recherche
  const [isMobile, setIsMobile] = useState(false)
  const [showMismatchPopup, setShowMismatchPopup] = useState(false)
  const videoRef = useRef(null)
  const readerRef = useRef(null)

  const playSound = (type) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Configuration selon le type de son
    switch (type) {
      case 'success':
        oscillator.frequency.value = 1500 // Son aigu
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.15)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        break
      case 'error':
        oscillator.frequency.value = 300 // Son grave
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.2)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        break
      default: // scan
        oscillator.frequency.value = 800 // Son moyen
        oscillator.type = 'sine'
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
    }

    // Nettoyage après la lecture
    setTimeout(() => {
      audioContext.close()
    }, 1000)
  }

  const playFeedback = (type = 'scan') => {  
    // Son selon le type
    try {
      playSound(type)
    } catch (error) {
      console.error('Erreur lors de la lecture du son:', error)
    }
  }

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    return () => {
      if (readerRef.current) {
        readerRef.current.reset()
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Bloquer toute saisie si le popup est affiché
      if (showMismatchPopup) {
        event.preventDefault();
        return;
      }
      
      // Gestion normale des entrées
      if (event.key === 'Enter' && manualInput) {
        event.preventDefault();
        playFeedback('scan');
        if (code1 && code2) {
          setCode1(manualInput);
          setCode2('');
          setResult('');
        } else if (!code1) {
          setCode1(manualInput);
        } else if (!code2) {
          setCode2(manualInput);
        }
        setManualInput('');
      }
    };

    const handleKeyDown = (event) => {
      // Double vérification pour la touche Entrée
      if (showMismatchPopup && event.key === 'Enter') {
        event.preventDefault();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scanning, code1, code2, manualInput, showMismatchPopup]);

  // Fonction pour s'inscrire
  const handleRegister = async () => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setUser(data);
        setError('');
        // Charger l'historique après la connexion
        loadHistory(data.id);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Erreur lors de l'inscription");
    }
  };

  // Fonction pour se connecter
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Identifiants invalides');
      }

      const userData = await response.json();
      setUser(userData);
      setIsAdmin(userData.is_admin);
      setError('');
      setCode1('');
      setCode2('');
      setResult('');
      setLastScanResult(null);
      setCurrentView('scan');
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Erreur de connexion:', error);
      alert(error.message);
    }
  };

  // Fonction pour se déconnecter
  const handleLogout = () => {
    setUser(null);
    setCode1('');
    setCode2('');
    setResult('');
    setLastScanResult(null);
    setHistory([]);
    setCurrentView('scan');
    localStorage.removeItem('user');
  };

  // Charger l'historique des scans
  const loadHistory = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/scans/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        // Réinitialiser les codes et le résultat lors du chargement d'un nouvel historique
        setCode1('');
        setCode2('');
        setResult('');
        setLastScanResult(null);
      } else {
        console.error('Erreur lors du chargement de l\'historique');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchAllScans = async () => {
    if (!isAdmin || !user) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/scans?userId=${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setAllScans(data);
      } else {
        console.error('Erreur lors de la récupération des scans:', data.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin || !user) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/users?userId=${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      } else {
        console.error('Erreur lors de la récupération des utilisateurs:', data.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        fetchUsers();
        alert('Utilisateur supprimé avec succès');
      } else {
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const toggleUserAdmin = async (userId, isAdmin) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}?userId=${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_admin: !isAdmin })
      });
      const data = await response.json();
      if (response.ok) {
        fetchUsers();
      } else {
        alert(data.error || 'Erreur lors de la modification des droits');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification des droits');
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });
      const data = await response.json();
      
      if (response.ok) {
        setNewUser({ username: '', password: '', is_admin: false });
        setShowNewUserForm(false);
        fetchUsers();
        alert('Utilisateur créé avec succès');
      } else {
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création');
    }
  };

  const resetUserPassword = async () => {
    if (!resetPasswordData.newPassword) {
      alert('Veuillez entrer un nouveau mot de passe');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users/${resetPasswordData.userId}/reset-password?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: resetPasswordData.newPassword })
      });
      const data = await response.json();
      
      if (response.ok) {
        setResetPasswordData({ userId: null, newPassword: '' });
        setShowResetPasswordForm(false);
        alert('Mot de passe réinitialisé avec succès');
      } else {
        alert(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la réinitialisation');
    }
  };

  const handleScan = async () => {
    if (code1 && code2) {
      try {
        const response = await fetch(`${API_URL}/scans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            code1,
            code2,
            isMatch: code1 === code2
          })
        });

        if (response.ok) {
          const scan = await response.json();
          setHistory(prev => [scan, ...prev]);
          if (code1 === code2) {
            playFeedback('success');
          } else {
            setShowMismatchPopup(true);
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du scan:', error);
      }
    }

    // Réinitialiser après le scan
    setCode1('');
    setCode2('');
    setResult('');
    // Redémarrer le scan
    startScanning(1);
  };

  const handleCodeValidation = () => {
    // Ne pas valider si un scan est en cours
    if (scanning) {
      return;
    }

    if (code1 && code2) {
      const isMatch = code1 === code2;
      if (!isMatch) {
        setShowMismatchPopup(true);
      } else {
        handleScan();
      }
    }
  };

  useEffect(() => {
    handleCodeValidation();
  }, [code1, code2]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/scans?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        console.error('Erreur lors de la récupération de l\'historique');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la récupération de l\'historique');
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  useEffect(() => {
    if (isAdmin && currentView === 'admin' && adminView === 'scans') {
      fetchAllScans();
    }
  }, [isAdmin, currentView, adminView, fetchAllScans]);

  useEffect(() => {
    if (isAdmin && currentView === 'admin' && adminView === 'users') {
      fetchUsers();
    }
  }, [isAdmin, currentView, adminView]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // Soustraire une heure pour corriger le décalage
    date.setHours(date.getHours() - 1);
    
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Paris'
    };
    return date.toLocaleString('fr-FR', options);
  };

  const clearHistory = async () => {
    try {
      await fetch(`${API_URL}/scans/clear/${user.id}`, {
        method: 'DELETE'
      });
      setHistory([]);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'historique:', error);
    }
  };

  const startScanning = (codeNumber) => {
    // Si les deux codes sont remplis, on réinitialise avant de scanner
    if (code1 && code2) {
      reset()
    }
    setScanningFor(codeNumber)
    setScanning(true)
  }

  const stopScanning = () => {
    setScanning(false)
    if (readerRef.current) {
      readerRef.current.reset()
    }
  }

  const reset = () => {
    setCode1('')
    setCode2('')
    setResult('')
    setScanning(false)
    if (readerRef.current) {
      readerRef.current.reset()
    }
  }

  // Initialiser la taille de police à partir des données utilisateur
  useEffect(() => {
    if (user && user.font_size) {
      setFontSize(user.font_size);
      document.documentElement.setAttribute('data-font-size', user.font_size);
    }
  }, [user]);

  const changeFontSize = async (size) => {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fontSize: size })
      });

      if (response.ok) {
        setFontSize(size);
        document.documentElement.setAttribute('data-font-size', size);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la mise à jour des préférences');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour des préférences');
    }
  };

  // Fonction pour filtrer les scans en fonction de la recherche
  const filterScans = (scans) => {
    if (!searchQuery) return scans;

    return scans.filter(scan => {
      const searchLower = searchQuery.toLowerCase();
      
      // Recherche dans tous les champs si searchField est 'all'
      if (searchField === 'all') {
        return (
          scan.username.toLowerCase().includes(searchLower) ||
          scan.code1.toLowerCase().includes(searchLower) ||
          scan.code2.toLowerCase().includes(searchLower) ||
          formatDate(scan.scanned_at).toLowerCase().includes(searchLower)
        );
      }

      // Recherche dans un champ spécifique
      switch (searchField) {
        case 'username':
          return scan.username.toLowerCase().includes(searchLower);
        case 'code1':
          return scan.code1.toLowerCase().includes(searchLower);
        case 'code2':
          return scan.code2.toLowerCase().includes(searchLower);
        case 'date':
          return formatDate(scan.scanned_at).toLowerCase().includes(searchLower);
        default:
          return true;
      }
    });
  };

  const getSortedAdminScans = () => {
    let filteredScans = [...allScans];

    // Appliquer les filtres existants
    if (filterUser !== 'all') {
      filteredScans = filteredScans.filter(scan => scan.username === filterUser);
    }

    if (filterMatch !== 'all') {
      filteredScans = filteredScans.filter(scan => 
        filterMatch === 'match' ? scan.is_match : !scan.is_match
      );
    }

    // Appliquer la recherche
    filteredScans = filterScans(filteredScans);

    // Trier les résultats
    return filteredScans.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(b.scanned_at) - new Date(a.scanned_at);
          break;
        case 'user':
          comparison = a.username.localeCompare(b.username);
          break;
        case 'match':
          comparison = b.is_match - a.is_match;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const getUniqueUsers = () => {
    if (!allScans) return [];
    const users = new Set(allScans.map(scan => scan.username));
    return Array.from(users).sort();
  };

  const exportToExcel = () => {
    const dataToExport = getSortedAdminScans().map(scan => ({
      'Date': formatDate(scan.scanned_at),
      'Utilisateur': scan.username,
      'Code Document': scan.code1,
      'Code Produit': scan.code2,
      'Résultat': scan.is_match ? 'Correspondance' : 'Différent'
    }));

    const ws = xlsxUtils.json_to_sheet(dataToExport);
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, "Scans");

    const excelBuffer = xlsxWrite(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = `scans_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(data);
    link.download = fileName;
    link.click();
  };

  useEffect(() => {
    // Détection si l'appareil est mobile
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleRescan = () => {
    setCode1('');
    setCode2('');
    setStartingCode('document');
    setShowMismatchPopup(false);
  };

  // Vérifier la connexion au serveur au démarrage
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        setError('Impossible de se connecter au serveur local. Assurez-vous que le serveur est démarré sur le port 3002.');
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="app">
      {!user ? (
        <div className="auth-container">
          <h2>Connexion</h2>
          {error && <div className="error-message">{error}</div>}
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>
            Se connecter
          </button>
        </div>
      ) : (
        <div className="app">
          <div className="side-menu">
            <div className="user-profile">
              <span className="username">{user.username}</span>
            </div>
            <nav>
              <button 
                className={`menu-item ${currentView === 'scan' ? 'active' : ''}`}
                onClick={() => setCurrentView('scan')}
              >
                📷 Scanner
              </button>
              <button 
                className={`menu-item ${currentView === 'history' ? 'active' : ''}`}
                onClick={() => setCurrentView('history')}
              >
                📋 Historique
              </button>
              <button 
                className={`menu-item ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentView('settings')}
              >
                ⚙️ Options
              </button>
              {isAdmin && (
                <button 
                  className={`menu-item ${currentView === 'admin' ? 'active' : ''}`}
                  onClick={() => setCurrentView('admin')}
                >
                  👑 Panel Administrateur
                </button>
              )}
              <button 
                className="menu-item logout-button"
                onClick={handleLogout}
              >
                <FontAwesomeIcon icon={faRightFromBracket} /> Déconnexion
              </button>
            </nav>
          </div>
          
          <div className="main-content">
            {currentView === 'settings' ? (
              <div className="settings-container">
                <h2>Options</h2>
                <div className="settings-group">
                  <h3>Taille du texte</h3>
                  <div className="font-size-buttons">
                    <button 
                      className={fontSize === 'small' ? 'active' : ''}
                      onClick={() => changeFontSize('small')}
                    >
                      Petit
                    </button>
                    <button 
                      className={fontSize === 'normal' ? 'active' : ''}
                      onClick={() => changeFontSize('normal')}
                    >
                      Normal
                    </button>
                    <button 
                      className={fontSize === 'large' ? 'active' : ''}
                      onClick={() => changeFontSize('large')}
                    >
                      Grand
                    </button>
                  </div>
                </div>
              </div>
            ) : currentView === 'history' ? (
              <div className="history-section">
                <h2>Historique des scans</h2>
                <div className="history-list">
                  {history.map((scan) => (
                    <div key={scan.id} className={`history-item ${scan.is_match ? 'match' : 'no-match'}`}>
                      <div className="scan-info">
                        <div>Code Document: {scan.code1}</div>
                        <div>Code Produit: {scan.code2}</div>
                        <div className="scan-result">
                          {scan.is_match ? 
                            '✅ Codes identiques' : 
                            '❌ Codes différents'}
                        </div>
                      </div>
                      <div className="scan-date">{formatDate(scan.scanned_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : currentView === 'admin' ? (
              <div className="admin-section">
                <h2>Panel Administrateur</h2>
                <div className="admin-tabs">
                  <button 
                    className={`tab ${adminView === 'scans' ? 'active' : ''}`}
                    onClick={() => setAdminView('scans')}
                  >
                    📊 Scans
                  </button>
                  <button 
                    className={`tab ${adminView === 'users' ? 'active' : ''}`}
                    onClick={() => setAdminView('users')}
                  >
                    👥 Utilisateurs
                  </button>
                </div>

                {adminView === 'scans' ? (
                  <div className="admin-scans-container">
                    <div className="admin-controls">
                      <div className="search-controls">
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select 
                          value={searchField} 
                          onChange={(e) => setSearchField(e.target.value)}
                        >
                          <option value="all">Tous les champs</option>
                          <option value="username">Nom d'utilisateur</option>
                          <option value="code1">Code Document</option>
                          <option value="code2">Code Produit</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                      <div className="sort-controls">
                        <label>Trier par :</label>
                        <select 
                          value={sortField} 
                          onChange={(e) => setSortField(e.target.value)}
                        >
                          <option value="date">Date</option>
                          <option value="user">Utilisateur</option>
                          <option value="match">Résultat</option>
                        </select>
                        <button 
                          onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                          className="sort-order-button"
                        >
                          <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown} />
                        </button>
                      </div>
                      <div className="filter-controls">
                        <label>Filtrer par résultat :</label>
                        <select 
                          value={filterMatch} 
                          onChange={(e) => setFilterMatch(e.target.value)}
                        >
                          <option value="all">Tous</option>
                          <option value="match">Correspondants</option>
                          <option value="nomatch">Non correspondants</option>
                        </select>
                      </div>
                      <div className="filter-controls">
                        <label>Filtrer par utilisateur :</label>
                        <select
                          value={filterUser}
                          onChange={(e) => setFilterUser(e.target.value)}
                        >
                          <option value="all">Tous</option>
                          {getUniqueUsers().map(username => (
                            <option key={username} value={username}>
                              {username}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={exportToExcel}
                        className="export-button"
                      >
                        <FontAwesomeIcon icon={faFileExcel} /> Exporter
                      </button>
                    </div>

                    <div className="scans-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Utilisateur</th>
                            <th>Code Document</th>
                            <th>Code Produit</th>
                            <th>Résultat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedAdminScans().map((scan) => (
                            <tr key={scan.id} className={scan.is_match ? 'match' : 'no-match'}>
                              <td>{formatDate(scan.scanned_at)}</td>
                              <td>{scan.username}</td>
                              <td className="code-cell">{scan.code1}</td>
                              <td className="code-cell">{scan.code2}</td>
                              <td className="result-cell">
                                {scan.is_match ? 
                                  <span className="match-result">✅ Correspond</span> : 
                                  <span className="no-match-result">❌ Différent</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={fetchUsers}>Rafraîchir la liste</button>
                    <button 
                      className="create-user-btn"
                      onClick={() => setShowNewUserForm(true)}
                    >
                      ➕ Créer un utilisateur
                    </button>
                    
                    {showNewUserForm && (
                      <div className="new-user-form">
                        <h3>Créer un nouvel utilisateur</h3>
                        <input
                          type="text"
                          placeholder="Nom d'utilisateur"
                          value={newUser.username}
                          onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                        />
                        <input
                          type="password"
                          placeholder="Mot de passe"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        />
                        <label>
                          <input
                            type="checkbox"
                            checked={newUser.is_admin}
                            onChange={(e) => setNewUser(prev => ({ ...prev, is_admin: e.target.checked }))}
                          />
                          Administrateur
                        </label>
                        <div className="form-actions">
                          <button onClick={createUser} className="create">Créer</button>
                          <button onClick={() => {
                            setShowNewUserForm(false);
                            setNewUser({ username: '', password: '', is_admin: false });
                          }} className="cancel">Annuler</button>
                        </div>
                      </div>
                    )}
                    <div className="users-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Utilisateur</th>
                            <th>Date de création</th>
                            <th>Rôle</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id}>
                              <td>{u.username}</td>
                              <td>{formatDate(u.created_at)}</td>
                              <td>{u.is_admin ? '👑 Admin' : '👤 Utilisateur'}</td>
                              <td>
                                {user.id !== u.id && (
                                  <div className="user-actions">
                                    <button 
                                      className={u.is_admin ? 'remove-admin' : 'make-admin'}
                                      onClick={() => toggleUserAdmin(u.id, u.is_admin)}
                                    >
                                      {u.is_admin ? 'Retirer admin' : 'Faire admin'}
                                    </button>
                                    <button 
                                      className="reset-password"
                                      onClick={() => {
                                        setResetPasswordData({ userId: u.id, newPassword: '' });
                                        setShowResetPasswordForm(true);
                                      }}
                                    >
                                      🔑 Réinitialiser mot de passe
                                    </button>
                                    <button 
                                      className="delete-user"
                                      onClick={() => deleteUser(u.id)}
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="scan-container">
                {!scanning ? (
                  <div className="input-codes-section">
                    <div className="manual-input">
                      <input
                        type="text"
                        placeholder={`Scanner ou saisir le ${startingCode === 'document' ? 'code document' : 'code produit'}`}
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            if (startingCode === 'document') {
                              setCode1(e.target.value);
                              setStartingCode('product');
                            } else {
                              setCode2(e.target.value);
                              setStartingCode('document');
                            }
                            setManualInput('');
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    
                    <div className="codes-section">
                      <div 
                        className={`code-display ${startingCode === 'document' ? 'selected' : ''}`}
                        onClick={() => setStartingCode('document')}
                      >
                        <h3>
                          <FontAwesomeIcon icon={faFileInvoice} className="icon" />
                          Code Document: <span>{code1 || 'Non scanné'}</span>
                        </h3>
                      </div>
                      
                      <div 
                        className={`code-display ${startingCode === 'product' ? 'selected' : ''}`}
                        onClick={() => setStartingCode('product')}
                      >
                        <h3>
                          <FontAwesomeIcon icon={faBarcode} className="icon" />
                          Code Produit: <span>{code2 || 'Non scanné'}</span>
                        </h3>
                      </div>
                    </div>

                    {showMismatchPopup && (
                      <div className="popup-overlay">
                        <div className="popup-content">
                          <h2 className="popup-title">Les codes ne correspondent pas</h2>
                          <div className="popup-codes">
                            <div className="popup-code">
                              <strong>{startingCode === 'document' ? 'Code Document:' : 'Code Produit:'}</strong> {code1}
                            </div>
                            <div className="popup-code">
                              <strong>{startingCode === 'document' ? 'Code Produit:' : 'Code Document:'}</strong> {code2}
                            </div>
                          </div>
                          <p style={{ textAlign: 'center', color: '#666', marginTop: '1rem' }}>
                            Voulez-vous confirmer ces codes ou les scanner à nouveau ?
                          </p>
                          <div className="popup-buttons">
                            <button className="popup-confirm" onClick={handleScan}>
                              Confirmer
                            </button>
                            <button className="popup-rescan" onClick={handleRescan}>
                              Scanner à nouveau
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="scanner-section">
                    <video ref={videoRef}></video>
                    <div className="scanner-overlay">
                      <div className="scan-region"></div>
                    </div>
                    <button className="cancel-button" onClick={stopScanning}>Annuler</button>
                  </div>
                )}
                <div className="result-section">
                  {(code1 || code2) && (
                    <div className={`result ${code1 && code2 ? (code1 === code2 ? 'success' : 'error shake') : ''}`}>
                      {!code1 && code2 ? (
                        <h2>En attente du Code Document...</h2>
                      ) : !code2 && code1 ? (
                        <h2>En attente du Code Produit...</h2>
                      ) : code1 && code2 ? (
                        <>
                          <h2>{code1 === code2 ? 'Les codes correspondent !' : 'Les codes sont différents.'}</h2>
                          <button onClick={() => {
                            setCode1('');
                            setCode2('');
                          }}>
                            Effacer les codes
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                  {(result || lastScanResult) && (
                    <div className={`scan-result ${(result || lastScanResult).includes('correspondent') ? 'success' : 'error'}`}>
                      {result || lastScanResult}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showResetPasswordForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Réinitialiser le mot de passe</h2>
            <div className="form-group">
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData({
                  ...resetPasswordData,
                  newPassword: e.target.value
                })}
                className="input-field"
              />
            </div>
            <div className="modal-buttons">
              <button 
                onClick={resetUserPassword}
                className="button primary-button"
              >
                Confirmer
              </button>
              <button 
                onClick={() => {
                  setResetPasswordData({ userId: null, newPassword: '' });
                  setShowResetPasswordForm(false);
                }}
                className="button secondary-button"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
