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

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000';

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
    // Vibration selon le type
    if ('vibrate' in navigator) {
      switch(type) {
        case 'success':
          navigator.vibrate([100, 50, 100])
          break
        case 'error':
          navigator.vibrate([200])
          break
        default:
          navigator.vibrate(50)
      }
    }
    
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

  const getBackCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('arrière') ||
        camera.label.toLowerCase().includes('rear')
      )
      return backCamera ? { deviceId: { exact: backCamera.deviceId } } : { facingMode: { exact: 'environment' } }
    } catch (error) {
      console.error('Erreur lors de la recherche de la caméra:', error)
      return { facingMode: { exact: 'environment' } }
    }
  }

  useEffect(() => {
    const startCamera = async () => {
      if (scanning && videoRef.current) {
        try {
          const backCameraConstraints = await getBackCamera()
          readerRef.current
            .decodeFromConstraints(
              {
                audio: false,
                video: {
                  width: { min: 640, ideal: 1280, max: 1920 },
                  height: { min: 480, ideal: 720, max: 1080 },
                  ...backCameraConstraints,
                }
              },
              videoRef.current,
              (result, err) => {
                if (result) {
                  const scannedCode = result.getText()
                  if (scanningFor === 1) {
                    setCode1(scannedCode)
                  } else {
                    setCode2(scannedCode)
                  }
                  playFeedback('scan')
                  stopScanning()
                }
                if (err && !(err instanceof TypeError)) {
                  console.warn(err)
                }
              }
            )
            .catch(err => {
              console.error("Erreur d'accès à la caméra:", err)
              alert("Erreur d'accès à la caméra. Assurez-vous d'avoir donné les permissions nécessaires.")
            })
        } catch (error) {
          console.error('Erreur lors du démarrage de la caméra:', error)
          alert("Impossible d'accéder à la caméra arrière. Vérifiez vos permissions.")
        }
      }
    }
    startCamera()
  }, [scanning, scanningFor])

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Si on est en train de scanner avec la caméra, on ignore les entrées clavier
      if (scanning) return
      
      // Si on appuie sur Entrée et qu'on a du texte
      if (event.key === 'Enter' && manualInput) {
        playFeedback('scan')
        // Si les deux codes sont déjà remplis, on réinitialise avant d'ajouter le nouveau code
        if (code1 && code2) {
          setCode1(manualInput)
          setCode2('')
          setResult('')
        } else if (!code1) {
          setCode1(manualInput)
        } else if (!code2) {
          setCode2(manualInput)
        }
        setManualInput('')
      }
    }

    const handleInput = (event) => {
      if (!scanning) {
        setManualInput(event.target.value)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [scanning, code1, code2, manualInput])

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

  const handleScan = async (e) => {
    e?.preventDefault(); // Rendre le paramètre e optionnel

    if (!code1 || !code2) {
      setError('Veuillez scanner les deux codes');
      return;
    }

    const isMatch = code1 === code2;

    // Mettre à jour le résultat et jouer le feedback sonore
    const resultText = `${code1} ${isMatch ? '=' : '≠'} ${code2}`;
    const newResult = isMatch ? `✅ Les codes correspondent ! ` : `❌ Les codes sont différents. (${resultText})`;
    setResult(newResult);
    setLastScanResult(newResult);
    playFeedback(isMatch ? 'success' : 'error');

    // Si les codes ne correspondent pas et que ce n'est pas une confirmation
    if (!isMatch && !showMismatchPopup) {
      setShowMismatchPopup(true);
      return;
    }

    // Lancer les confettis si les codes correspondent
    if (isMatch) {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 1 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
    }

    try {
      const response = await fetch(`${API_URL}/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          code1,
          code2,
          isMatch,
          confirmed: !isMatch // Si les codes ne correspondent pas, marquer comme confirmé
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement du scan');
      }

      const newScan = await response.json();
      setHistory(prevHistory => [newScan, ...prevHistory]);
      
      // Fermer le popup et réinitialiser les codes
      setShowMismatchPopup(false);
      setCode1('');
      setCode2('');
      if (readerRef.current) {
        readerRef.current.reset();
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors de l\'enregistrement du scan');
    }
  };

  const handleCodeValidation = () => {
    if (code1 && code2) {
      if (code1 !== code2) {
        setShowMismatchPopup(true);
      } else {
        // Les codes correspondent, sauvegarder directement
        handleScan(true);
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
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'historique');
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la récupération de l\'historique');
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    if (code1 && code2) {
      const isMatch = code1 === code2;
      handleScan(isMatch);
    }
  }, [code1, code2]);

  useEffect(() => {
    if (isAdmin && currentView === 'admin' && adminView === 'scans') {
      fetchAllScans();
    }
  }, [isAdmin, currentView, adminView]);

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

  const clearHistory = () => {
    setHistory([])
  }

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

  const getSortedAdminScans = () => {
    if (!allScans) return [];
    
    return [...allScans].sort((a, b) => {
      switch (sortField) {
        case 'date':
          return sortOrder === 'desc' 
            ? new Date(b.scanned_at) - new Date(a.scanned_at)
            : new Date(a.scanned_at) - new Date(b.scanned_at);
        case 'user':
          return sortOrder === 'desc'
            ? b.username.localeCompare(a.username)
            : a.username.localeCompare(b.username);
        case 'match':
          return sortOrder === 'desc'
            ? (b.is_match ? 1 : 0) - (a.is_match ? 1 : 0)
            : (a.is_match ? 1 : 0) - (b.is_match ? 1 : 0);
        default:
          return 0;
      }
    }).filter(scan => {
      // Appliquer les deux filtres
      const matchFilter = filterMatch === 'all' ? true : 
        filterMatch === 'match' ? scan.is_match : !scan.is_match;
      const userFilter = filterUser === 'all' ? true : 
        scan.username === filterUser;
      
      return matchFilter && userFilter;
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
                            <button className="popup-rescan" onClick={() => {
                              setCode1('');
                              setCode2('');
                              setShowMismatchPopup(false);
                            }}>
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
            <h3>Réinitialiser le mot de passe</h3>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={resetPasswordData.newPassword}
              onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            />
            <div className="form-actions">
              <button onClick={resetUserPassword} className="create">Réinitialiser</button>
              <button 
                onClick={() => {
                  setShowResetPasswordForm(false);
                  setResetPasswordData({ userId: null, newPassword: '' });
                }} 
                className="cancel"
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
