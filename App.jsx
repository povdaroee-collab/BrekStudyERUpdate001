// =================================================================
// 5. APP LOGIC & RENDER
// =================================================================
function App() {
  
  // !! ថ្មី !!: ទាញអថេរ និង Functions ពី Global Scope
  const {
    getTodayLocalDateString,
    getTodayLocalMonthString,
    calculateDuration,
    firebaseConfigRead,
    firebaseConfigWrite,
    translations,
    backgroundStyles,
    IconSearch, IconClock, IconCheckCircle, IconQrCode, IconSettings, IconTicket
  } = window.appSetup;

  // !! ថ្មី !!: ទាញ Components ពី Global Scope
  const { 
    StudentCard, OnBreakStudentListCard, CompletedStudentListCard, 
    CompletedListHeader, LoadingSpinner, DeleteConfirmationModal,
    PasswordConfirmationModal, AdminActionModal, QrScannerModal,
    InfoAlertModal, InputPromptModal
  } = window; 
  
  const { SettingsPage } = window; 

  // --- States ---
  const [dbRead, setDbRead] = useState(null); 
  const [dbWrite, setDbWrite] = useState(null); 
  const [userId, setUserId] = useState(null); 
  const [students, setStudents] = useState([]); 
  const [attendance, setAttendance] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(""); 
  const [currentPage, setCurrentPage] = useState('search'); 
  const [authError, setAuthError] = useState(null); 
  const [modalStudent, setModalStudent] = useState(null);
  const [now, setNow] = useState(new Date());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // const [searchResults, setSearchResults] = useState([]); // !! លុប State នេះ !!
  const [passwordPrompt, setPasswordPrompt] = useState({ isOpen: false });
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(null);
  const [bulkDeleteDate, setBulkDeleteDate] = useState(getTodayLocalDateString());
  const [bulkDeleteMonth, setBulkDeleteMonth] = useState(getTodayLocalMonthString());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [totalPasses, setTotalPasses] = useState(0); 
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isScannerBusy, setIsScannerBusy] = useState(false); 
  const [lastScannedInfo, setLastScannedInfo] = useState(null); 
  const [scannerTriggeredCheckIn, setScannerTriggeredCheckIn] = useState(null); 
  const [infoAlert, setInfoAlert] = useState({ isOpen: false, message: '', type: 'info' });
  const [inputPrompt, setInputPrompt] = useState({ isOpen: false });
  const [language, setLanguage] = useState(localStorage.getItem('break_lang') || 'km');
  const [background, setBackground] = useState(localStorage.getItem('break_bg') || 'style1');
  const [adminPassword, setAdminPassword] = useState(null); 
  const [checkInMode, setCheckInMode] = useState('scan'); 
  const [overtimeLimit, setOvertimeLimit] = useState(15); // !! ថ្មី !!: State សម្រាប់នាទី Overtime

  // --- Refs សម្រាប់ Stale State ---
  const t = translations[language] || translations['km'];
  const tRef = React.useRef(t); 
  const attendanceRef = React.useRef(attendance); 

  // --- មុខងារ TTS ---
  const speak = React.useCallback((text) => {
    try {
      if (!window.speechSynthesis) {
        console.warn("Browser does not support Speech Synthesis.");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'km-KH'; 
      utterance.rate = 0.9; 
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis Error:", e);
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); 
    return () => clearInterval(timer);
  }, []); 

  useEffect(() => {
    localStorage.setItem('break_lang', language);
    tRef.current = translations[language] || translations['km']; 
  }, [language, translations]);

  useEffect(() => {
    localStorage.setItem('break_bg', background);
  }, [background]);

  useEffect(() => {
    attendanceRef.current = attendance;
  }, [attendance]);


  // ជំហានទី 1: ដំណើរការ Firebase ទាំងពីរ
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const readApp = initializeApp(firebaseConfigRead, 'readApp');
        const authInstanceRead = getAuth(readApp);
        const dbInstanceRead = getDatabase(readApp);
        
        const writeApp = initializeApp(firebaseConfigWrite, 'writeApp');
        const authInstanceWrite = getAuth(writeApp);
        const dbInstanceWrite = getDatabase(writeApp);

        try {
          await signInAnonymously(authInstanceRead);
          console.log("Read App (dilistname) Signed in.");
          setDbRead(dbInstanceRead); 
        } catch (error) {
          console.error('Read App Auth Error:', error);
          setAuthError(`Read Auth Error: ${error.message}`);
        }
        
        onAuthStateChanged(authInstanceWrite, async (user) => {
          if (user) {
            console.log("Write App (brakelist) Signed in.");
            setUserId(user.uid);
            setDbWrite(dbInstanceWrite); 
          } else {
            try {
              await signInAnonymously(authInstanceWrite);
            } catch (authError) {
              console.error('Write App Auth Error:', authError);
              setAuthError(`Write Auth Error: ${authError.message}`);
            }
          }
        });
        
      } catch (error) {
        console.error('Firebase Init Error:', error);
        setAuthError(`Firebase Init Error: ${error.message}`);
      }
    };
    
    initFirebase();
  }, [initializeApp, signInAnonymously, getAuth, getDatabase, firebaseConfigRead, firebaseConfigWrite]);
  
  // ជំហានទី 2: ទាញទិន្នន័យ (ពី DB ផ្សេងគ្នា)
  useEffect(() => {
    if (dbRead && dbWrite) {
      setLoading(true);
      
      // 1. ទាញបញ្ជី Students (dbRead)
      const studentsRef = ref(dbRead, 'students');
      const unsubscribeStudents = onValue(studentsRef, (snapshot) => {
          const studentsData = snapshot.val();
          const studentList = [];
          if (studentsData) {
            Object.keys(studentsData).forEach((key) => {
              const student = studentsData[key];
              studentList.push({
                id: key, ...student,
                name: student.name || student.ឈ្មោះ,
                idNumber: student.idNumber || student.អត្តលេខ,
                photoUrl: student.photoUrl || student.រូបថត,
                class: student.class || student.ថា្នក់,
              });
            });
          }
          studentList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setStudents(studentList);
          console.log("Student list fetched.");
          setLoading(false); 
      }, (error) => {
          console.error('Student Fetch Error (dbRead):', error);
          setAuthError(`Student Fetch Error: ${error.message}`);
          setLoading(false);
      });

      // 2. ទាញ Attendance ថ្ងៃនេះ (dbWrite)
      const attendanceRefDb = ref(dbWrite, 'attendance');
      const qAttendance = rtdbQuery(attendanceRefDb, orderByChild('date'), equalTo(appSetup.todayString));
      const unsubscribeAttendance = onValue(qAttendance, (snapshot) => {
          const attMap = {};
          const attData = snapshot.val();
          if (attData) {
            Object.keys(attData).forEach((key) => {
              const data = attData[key];
              if (!attMap[data.studentId]) {
                attMap[data.studentId] = []; 
              }
              attMap[data.studentId].push({ id: key, ...data });
            });
          }
          for (const studentId in attMap) {
            attMap[studentId].sort((a, b) => new Date(a.checkOutTime) - new Date(b.checkOutTime));
          }
          setAttendance(attMap); 
          console.log("Attendance data fetched/updated.");
      }, (error) => {
          console.error('Attendance Fetch Error (dbWrite):', error);
          setAuthError(`Attendance Fetch Error: ${error.message}`);
      });
      
      // 3. ទាញ Total Passes (dbWrite)
      const passRef = ref(dbWrite, 'passManagement/totalPasses');
      const unsubscribePasses = onValue(passRef, (snapshot) => {
        const total = snapshot.val() || 0; 
        setTotalPasses(total);
        console.log(`Total passes set to: ${total}`);
      }, (error) => {
        console.error('Total Passes Fetch Error (dbWrite):', error);
      });
      
      // 4. ទាញ Admin Password (dbWrite)
      const passwordRef = ref(dbWrite, 'passManagement/adminPassword');
      const unsubscribePassword = onValue(passwordRef, (snapshot) => {
        const pass = snapshot.val();
        if (pass) {
          setAdminPassword(pass);
          console.log("Admin password fetched.");
        } else {
           setAdminPassword('4545ak0'); 
        }
      }, (error) => {
        console.error('Admin Password Fetch Error (dbWrite):', error);
        setAdminPassword('4545ak0'); 
      });
      
      // 5. ទាញ CheckIn Mode (dbWrite)
      const checkInModeRef = ref(dbWrite, 'passManagement/checkInMode');
      const unsubscribeCheckInMode = onValue(checkInModeRef, (snapshot) => {
        const mode = snapshot.val();
        if (mode) {
          setCheckInMode(mode);
          console.log(`Check-in mode set to: ${mode}`);
        }
      }, (error) => {
        console.error('Check-in Mode Fetch Error (dbWrite):', error);
      });
      
      // 6. !! ថ្មី !!: ទាញ Overtime Limit (dbWrite)
      const overtimeRef = ref(dbWrite, 'passManagement/overtimeLimit');
      const unsubscribeOvertime = onValue(overtimeRef, (snapshot) => {
        const limit = snapshot.val();
        if (limit && !isNaN(parseInt(limit))) {
          setOvertimeLimit(parseInt(limit));
          console.log(`Overtime limit set to: ${limit}`);
        } else {
          setOvertimeLimit(15); // Default
          console.log("No overtime limit set in DB, defaulting to 15.");
        }
      }, (error) => {
        console.error('Overtime Limit Fetch Error (dbWrite):', error);
        setOvertimeLimit(15); // Default on error
      });
      
      return () => {
        unsubscribeStudents();
        unsubscribeAttendance();
        unsubscribePasses(); 
        unsubscribePassword();
        unsubscribeCheckInMode();
        unsubscribeOvertime(); // !! ថ្មី !!
      };
    }
  }, [dbRead, dbWrite, appSetup.todayString, rtdbQuery, ref, onValue, orderByChild, equalTo]);

  // --- Data Preparation for Render ---
  const sortedStudentsOnBreak = React.useMemo(() => {
    return students
      .map(student => {
        const breaks = attendance[student.id] || [];
        const activeBreak = breaks.find(r => r.checkOutTime && !r.checkInTime);
        if (!activeBreak) return null; 
        const elapsedMins = calculateDuration(activeBreak.checkOutTime, now.toISOString()); 
        // !! កែសម្រួល !!: ប្រើ State 'overtimeLimit'
        const isOvertime = elapsedMins > overtimeLimit; 
        return { student, record: activeBreak, elapsedMins, isOvertime };
      })
      .filter(Boolean) 
      .sort((a, b) => {
        // 1. Overtime តែងតែនៅខាងលើ
        if (a.isOvertime !== b.isOvertime) {
          return a.isOvertime ? -1 : 1; 
        }
        
        // 2. បើទាំងពីរ Overtime, យកអ្នក Overtime យូរជាងគេមកលើ
        if (a.isOvertime) { 
          return b.elapsedMins - a.elapsedMins;
        }
        
        // 3. បើទាំងពីរមិន Overtime, យកអ្នកទើបចេញ (នាទីតិច) មកលើ
        return a.elapsedMins - b.elapsedMins; 
      });
  // !! កែសម្រួល !!: បន្ថែម overtimeLimit ក្នុង dependency array
  }, [students, attendance, now, calculateDuration, overtimeLimit]); 

  const allCompletedBreaks = React.useMemo(() => {
    const breaks = [];
    students.forEach(student => {
      const studentBreaks = attendance[student.id] || [];
      studentBreaks.forEach(record => {
        if (record.checkInTime && record.checkOutTime) {
          breaks.push({ student, record });
        }
      });
    });
    breaks.sort((a, b) => new Date(b.record.checkInTime) - new Date(a.record.checkInTime));
    return breaks;
  }, [students, attendance]);

  const selectedStudent = React.useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
  [students, selectedStudentId]);
  
  const studentsOnBreakCount = sortedStudentsOnBreak.length;
  
  
  // !! ថ្មី !!: ផ្លាស់ប្តូរ Search Logic ទៅជា useMemo ដើម្បីឲ្យវា Real-time
  const searchResults = React.useMemo(() => {
    const normalizedSearch = String(searchTerm).replace(/\s+/g, '').toLowerCase();

    if (normalizedSearch === "" || !isSearchFocused) { // កែសម្រួល: មិនបាច់បង្ហាញទេ បើ Search bar មិន Focus
      return []; 
    }
    
    // ប្រើ 'attendance' state ដោយផ្ទាល់ មិនបាច់ dùng Ref
    const currentAttendance = attendance; 
    const currentT = t;
      
    const matches = students.filter(student => 
      (student.name && student.name.replace(/\s+/g, '').toLowerCase().includes(normalizedSearch)) ||
      (student.idNumber && String(student.idNumber).replace(/\s+/g, '').includes(normalizedSearch))
    ).slice(0, 10); 
    
    const matchesWithStatus = matches.map(student => {
      const studentBreaks = currentAttendance[student.id] || []; 
      const activeBreak = studentBreaks.find(r => r.checkOutTime && !r.checkInTime);
      const completedBreaks = studentBreaks.filter(r => r.checkOutTime && r.checkInTime);

      let statusText = currentT.statusNotYet; 
      let passNumber = null;
      let statusColor = 'text-gray-500';

      if (activeBreak) {
        statusText = currentT.statusOnBreak; 
        passNumber = activeBreak.passNumber || null;
        statusColor = 'text-yellow-600';
      } else if (completedBreaks.length > 0) {
        statusText = currentT.statusCompleted; 
        statusColor = 'text-green-600';
      }
      
      return { ...student, statusText, passNumber, statusColor };
    });
    
    return matchesWithStatus;

  }, [searchTerm, students, attendance, t, isSearchFocused]); // !! កែសម្រួល !!: ឥឡូវវាអាស្រ័យលើ attendance និង isSearchFocused

  // Effect សម្រាប់គ្រប់គ្រង Scanner បន្ទាប់ពី Firebase Update
  useEffect(() => {
    if (scannerTriggeredCheckIn) {
      const newStudentsOnBreak = students
        .map(student => {
          const breaks = attendance[student.id] || [];
          return breaks.find(r => r.checkOutTime && !r.checkInTime);
        })
        .filter(Boolean);
      
      const newCount = newStudentsOnBreak.length;
      console.log(`Scanner triggered check-in. New break count: ${newCount}`);
      
      if (newCount === 0) {
        console.log("Last student checked in. Closing scanner.");
        setShowQrScanner(false);
        setCurrentPage('completed'); 
        setIsScannerBusy(false); 
        setScannerTriggeredCheckIn(null); 
        
      } else {
        console.log("Students still on break. Restarting scanner...");
        setIsScannerBusy(false); 
        setScannerTriggeredCheckIn(null); 
      }
    }
  }, [attendance, scannerTriggeredCheckIn, students]);


  // --- Helper function សម្រាប់ហៅ Alert ---
  const showAlert = React.useCallback((message, type = 'info') => {
    setInfoAlert({ isOpen: true, message, type });
  }, []);
  
  // --- មុខងារសម្រាប់កត់ត្រា (ប្រើ dbWrite) ---
  
  const handleCheckOut = React.useCallback(async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !dbWrite) return;
        
    if (studentsOnBreakCount >= totalPasses) {
      setAuthError(`${tRef.current.statusPassOut} (${studentsOnBreakCount}/${totalPasses})`);
      speak(tRef.current.statusPassOut);
      return; 
    }
    
    const usedPassNumbers = sortedStudentsOnBreak.map(b => b.record.passNumber).filter(Boolean);
    let nextPassNumber = null;
    for (let i = 1; i <= totalPasses; i++) {
      const passNum = 'DD_' + String(i).padStart(2, '0'); 
      if (!usedPassNumbers.includes(passNum)) {
        nextPassNumber = passNum;
        break;
      }
    }
    
    if (!nextPassNumber) {
      console.error("Logic Error: No available pass found.");
      setAuthError("!!! ERROR: មានបញ្ហាក្នុងការរកលេខកាតទំនេរ។");
      return;
    }

    const now = new Date();
    const studentBreaks = attendanceRef.current[student.id] || [];
    const completedBreaks = studentBreaks.filter(r => r.checkInTime && r.checkOutTime);
    const breakCount = completedBreaks.length;
    let breakType = (breakCount >= 2) ? "special" : "normal";
    
    speak(`${student.name || tRef.current.noName} ${tRef.current.statusOnBreak} ${tRef.current.statusPass} ${nextPassNumber}`);
    
    const attendanceRefDb = ref(dbWrite, 'attendance');
    const newRecordRef = push(attendanceRefDb);
    try {
      await set(newRecordRef, {
        studentId: studentId, 
        date: appSetup.todayString,
        checkInTime: null,
        checkOutTime: now.toISOString(), 
        breakType: breakType,
        passNumber: nextPassNumber 
      });
      
      setSearchTerm('');
      setSelectedStudentId('');
      // setSearchResults([]); // !! លុប !!
      setIsSearchFocused(false); 
    } catch (error) {
      console.error('Check-out Error (dbWrite):', error);
      setAuthError(`Check-out Error: ${error.message}`);
    }
  }, [dbWrite, students, studentsOnBreakCount, totalPasses, sortedStudentsOnBreak, speak, ref, push, set, appSetup.todayString]);
  
  const handleCheckIn = React.useCallback(async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !dbWrite) {
      console.error("Check-in Error: Student or DB not found.");
      return;
    }
    
    const studentBreaks = attendanceRef.current[student.id] || [];
    const activeBreak = studentBreaks.find(r => r.checkOutTime && !r.checkInTime);
    
    if (!activeBreak) {
       console.error("Check-in Error: No active break found.");
       return;
    }
    
    speak(`${student.name || tRef.current.noName} ${tRef.current.checkIn}`);
        
    const now = new Date();
    const docId = activeBreak.id; 
    const docRef = ref(dbWrite, `attendance/${docId}`);
    try {
      await update(docRef, { 
        checkInTime: now.toISOString(),
      });
      console.log(`Check-in update sent for ${student.name}`);
      
      setSearchTerm(''); 
      setSelectedStudentId(''); 
      // setSearchResults([]); // !! លុប !!
      setIsSearchFocused(false); 
      
    } catch (error) {
      console.error('Check-in Error (dbWrite):', error);
      setAuthError(`Check-in Error: ${error.message}`);
      setIsScannerBusy(false); 
      setScannerTriggeredCheckIn(null);
    }
  }, [dbWrite, students, speak, ref, update]);
  
  // --- មុខងារលុប និង Password ---
  
  const handleOpenPasswordModal = React.useCallback((message, onConfirmCallback) => {
    setPasswordPrompt({
      isOpen: true,
      message: message,
      onConfirm: onConfirmCallback,
      error: null
    });
  }, []);
  
  const handleOpenDeleteModal_Simple = React.useCallback((e, student, record) => {
    e.stopPropagation();
    setRecordToDelete({ student, record });
  }, []);
  
  const handlePasswordSubmit = React.useCallback((password) => {
    if (!adminPassword) { 
        setPasswordPrompt(prev => ({ ...prev, error: "សូមរង់ចាំ... Password កំពុង Load" }));
        return;
    }
    if (password === adminPassword) {
      passwordPrompt.onConfirm();
      setPasswordPrompt({ isOpen: false });
    } else {
      setPasswordPrompt(prev => ({ ...prev, error: tRef.current.passwordError }));
    }
  }, [adminPassword, passwordPrompt]);
  
  const handleConfirmDelete_Single = React.useCallback(async (recordId) => {
    if (!dbWrite) return;
    const docRef = ref(dbWrite, `attendance/${recordId}`);
    try {
      await remove(docRef);
      console.log("Delete successful!");
    } catch (error) {
      console.error('Delete Error (dbWrite):', error);
      setAuthError(`Delete Error: ${error.message}`);
    }
  }, [dbWrite, ref, remove]);
  
  const handleToggleSelectionMode = React.useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedRecords([]);
    setShowAdminModal(false);
  }, []);
  
  const handleRecordSelect = React.useCallback((recordId) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId) 
        : [...prev, recordId]
    );
  }, []);
  
  const handleOpenDeleteSelected = React.useCallback(() => {
    if (selectedRecords.length === 0) return;
    handleOpenPasswordModal(
      tRef.current.deleteSelectedTitle(selectedRecords.length),
      () => handleConfirmDelete_Multi()
    );
  }, [selectedRecords.length, tRef, handleOpenPasswordModal]);

  const handleConfirmDelete_Multi = React.useCallback(async () => {
    if (!dbWrite || selectedRecords.length === 0) return;
    const updates = {};
    selectedRecords.forEach(recordId => {
      updates[`/attendance/${recordId}`] = null;
    });
    try {
      await update(ref(dbWrite), updates);
      console.log("Multi-delete successful!");
      handleToggleSelectionMode();
    } catch (error) {
      console.error('Multi-Delete Error (dbWrite):', error);
      setAuthError(`Multi-Delete Error: ${error.message}`);
    }
  }, [dbWrite, selectedRecords, ref, update, handleToggleSelectionMode]);
  
  const handleOpenBulkDelete = React.useCallback((mode) => {
    setBulkDeleteMode(mode);
    setShowAdminModal(false);
    setTimeout(() => {
      handleOpenPasswordModal(
        mode === 'day' 
          ? tRef.current.deleteByDateTitle(bulkDeleteDate)
          : tRef.current.deleteByMonthTitle(bulkDeleteMonth),
        () => handleConfirmBulkDelete(mode)
      );
    }, 100);
  }, [bulkDeleteDate, bulkDeleteMonth, tRef, handleOpenPasswordModal]);
  
  const handleConfirmBulkDelete = React.useCallback(async (mode) => {
    if (!dbWrite) return;
    setIsBulkLoading(true);
    setAuthError(null);
    
    try {
      const attendanceRefDb = ref(dbWrite, 'attendance');
      const allDataSnapshot = await get(attendanceRefDb);
      if (!allDataSnapshot.exists()) {
        showAlert(tRef.current.deleteNotFound, 'error');
        setIsBulkLoading(false);
        return;
      }
      
      const allData = allDataSnapshot.val();
      const updates = {};
      let count = 0;
      const filterDate = mode === 'day' ? bulkDeleteDate : bulkDeleteMonth;
      
      Object.keys(allData).forEach(recordId => {
        const record = allData[recordId];
        if (record && record.date) {
          const recordDate = record.date;
          if (mode === 'day' && recordDate === filterDate) {
            updates[`/attendance/${recordId}`] = null;
            count++;
          } else if (mode === 'month' && recordDate.startsWith(filterDate)) {
            updates[`/attendance/${recordId}`] = null;
            count++;
          }
        }
      });
      
      if (count > 0) {
        await update(ref(dbWrite), updates);
        showAlert(tRef.current.deleteSuccess(count), 'success'); 
      } else {
        showAlert(tRef.current.deleteNotFound, 'error');
      }
    } catch (error) {
      console.error('Bulk Delete Error:', error);
      setAuthError(`Bulk Delete Error: ${error.message}`);
    } finally {
      setIsBulkLoading(false);
      setBulkDeleteMode(null);
    }
  }, [dbWrite, bulkDeleteDate, bulkDeleteMonth, tRef, showAlert, ref, get, update]);
  
  // --- មុខងារ Settings ថ្មី ---
  
  const handleEditTotalPasses = React.useCallback(() => {
    handleOpenPasswordModal(
      tRef.current.passwordRequired,
      () => {
        setInputPrompt({
          isOpen: true,
          title: tRef.current.editPassTotal,
          message: tRef.current.editPassTotalPrompt,
          defaultValue: totalPasses,
          type: 'number',
          onSubmit: (newTotalString) => {
            const newTotal = parseInt(newTotalString);
            if (newTotalString && !isNaN(newTotal) && newTotal >= 0) {
              const passRef = ref(dbWrite, 'passManagement/totalPasses');
              set(passRef, newTotal)
                .then(() => {
                  showAlert(tRef.current.passTotalSuccess, 'success');
                })
                .catch(err => {
                  setAuthError(`Error setting total passes: ${err.message}`);
                });
            } else if (newTotalString) {
              showAlert(tRef.current.invalidNumber, 'error');
            }
            setInputPrompt({ isOpen: false }); 
          },
          onCancel: () => setInputPrompt({ isOpen: false })
        });
      }
    );
  }, [handleOpenPasswordModal, tRef, totalPasses, dbWrite, ref, set, showAlert]);
  
  // !! ថ្មី !!: មុខងារកែសម្រួល Overtime Limit
  const handleEditOvertimeLimit = React.useCallback(() => {
    handleOpenPasswordModal(
      tRef.current.passwordRequired,
      () => {
        setInputPrompt({
          isOpen: true,
          title: tRef.current.overtimeLimit,
          message: tRef.current.overtimeLimitPrompt,
          defaultValue: overtimeLimit,
          type: 'number',
          onSubmit: (newLimitString) => {
            const newLimit = parseInt(newLimitString);
            if (newLimitString && !isNaN(newLimit) && newLimit > 0) {
              const overtimeRef = ref(dbWrite, 'passManagement/overtimeLimit');
              set(overtimeRef, newLimit)
                .then(() => {
                  showAlert(tRef.current.overtimeLimitSuccess, 'success');
                })
                .catch(err => {
                  setAuthError(`Error setting overtime limit: ${err.message}`);
                });
            } else if (newLimitString) {
              showAlert(tRef.current.invalidNumber, 'error');
            }
            setInputPrompt({ isOpen: false }); 
          },
          onCancel: () => setInputPrompt({ isOpen: false })
        });
      }
    );
  }, [handleOpenPasswordModal, tRef, overtimeLimit, dbWrite, ref, set, showAlert]);

  const handleEditPassword = React.useCallback(() => {
    handleOpenPasswordModal(
      tRef.current.passwordRequired, 
      () => {
        setInputPrompt({
          isOpen: true,
          title: tRef.current.changePassword,
          message: tRef.current.changePasswordPrompt,
          defaultValue: '',
          type: 'text',
          onSubmit: (newPassword) => {
            if (newPassword && newPassword.length >= 6) {
              const passRef = ref(dbWrite, 'passManagement/adminPassword');
              set(passRef, newPassword)
                .then(() => {
                  showAlert(tRef.current.changePasswordSuccess, 'success');
                })
                .catch(err => {
                  setAuthError(`Error setting password: ${err.message}`);
                });
            } else if (newPassword) {
              showAlert("Password ត្រូវមានយ៉ាងតិច 6 តួអក្សរ", 'error');
            }
            setInputPrompt({ isOpen: false }); 
          },
          onCancel: () => setInputPrompt({ isOpen: false })
        });
      }
    );
  }, [handleOpenPasswordModal, tRef, dbWrite, ref, set, showAlert]);

  const handleEditCheckInMode = React.useCallback(() => {
    handleOpenPasswordModal(
      tRef.current.checkInMethodPrompt,
      () => {
        const newMode = checkInMode === 'scan' ? 'auto' : 'scan';
        const modeRef = ref(dbWrite, 'passManagement/checkInMode');
        set(modeRef, newMode)
          .then(() => {
            showAlert(tRef.current.checkInModeSuccess, 'success');
          })
          .catch(err => {
            setAuthError(`Error setting check-in mode: ${err.message}`);
          });
      }
    );
  }, [handleOpenPasswordModal, tRef, checkInMode, dbWrite, ref, set, showAlert]);
  
  const handleCheckInByPassNumber = React.useCallback((passNumber) => {
    if (!passNumber || isScannerBusy) { 
      return;
    }
    
    const currentSortedStudentsOnBreak = students
      .map(student => {
        const breaks = attendanceRef.current[student.id] || [];
        const activeBreak = breaks.find(r => r.checkOutTime && !r.checkInTime);
        if (!activeBreak) return null; 
        return { student, record: activeBreak };
      })
      .filter(Boolean);

    const activeBreak = currentSortedStudentsOnBreak.find(b => b.record.passNumber === passNumber);
    
    if (activeBreak) {
      setIsScannerBusy(true); 
      setScannerTriggeredCheckIn(activeBreak.student.id); 
      setLastScannedInfo({ status: 'success', name: activeBreak.student.name || tRef.current.noName });
      
      handleCheckIn(activeBreak.student.id);
      
    } else {
      setLastScannedInfo({ status: 'fail', message: tRef.current.scanPassNotFound(passNumber) });
    }
  }, [isScannerBusy, students, tRef, handleCheckIn]);
  
  const handleOpenQrScanner = React.useCallback(() => {
    setLastScannedInfo(null);
    setScannerTriggeredCheckIn(null);
    setIsScannerBusy(false); 
    setShowQrScanner(true);
  }, []);

  
  // --- Search Handlers ---
  
  // !! កែសម្រួល !!: ធ្វើឲ្យ Search Handler នេះសាមញ្ញ
  const handleSearchChange = React.useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedStudentId(""); 
    // Logic ទាំងអស់ ត្រូវបានផ្លាស់ទីទៅ useMemo
  }, []); // មិនចាំបាច់មាន dependencies ទៀតទេ


  const handleSelectStudentFromList = React.useCallback((student) => {
    setSearchTerm(student.name || String(student.idNumber)); 
    setSelectedStudentId(student.id); 
    // setSearchResults([]); // !! លុប !!
    setIsSearchFocused(false); 
  }, []);


  // --- Main Render ---
  return (
    <React.Fragment>
      <div className={`min-h-screen ${backgroundStyles[background] || backgroundStyles['style1']} font-kantumruy p-4 transition-all duration-500`}>
        <div className="container mx-auto max-w-lg relative">
          
          <div 
            className={`transition-all duration-300 ease-in-out ${isSearchFocused ? '-translate-y-24' : 'translate-y-0'}`}
          >
            <h1 className="text-4xl font-bold text-center mb-2 text-white">
              {t.appTitle}
            </h1>
            <p className="text-xl text-center text-blue-200 mb-6">
              {appSetup.displayDate}
            </p>
          </div>

          {/* --- TABS --- */}
          <div className={`w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-full p-1 flex space-x-1 mb-6 transition-all duration-300 ease-in-out ${isSearchFocused ? '-translate-y-24' : 'translate-y-0'}`}>
            
            <button
              onClick={() => setCurrentPage('search')}
              className={`w-1/5 px-2 py-3 rounded-full flex items-center justify-center transition-colors relative ${
                currentPage === 'search' ? 'bg-white text-blue-800 shadow-lg' : 'text-white'
              }`}
            >
              <span className="relative z-10 flex items-center"><IconSearch /></span>
            </button>
            
            <button
              onClick={() => setCurrentPage('onBreak')}
              className={`w-1/5 px-2 py-3 rounded-full flex items-center justify-center transition-colors relative ${
                currentPage === 'onBreak' ? 'bg-white text-blue-800 shadow-lg' : 'text-white'
              }`}
            >
              <span className="relative z-10 flex items-center">
                <IconClock />
                {studentsOnBreakCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {studentsOnBreakCount}
                  </span>
                )}
              </span>
            </button>
            
            <button
              onClick={() => setCurrentPage('completed')}
              className={`w-1/5 px-2 py-3 rounded-full flex items-center justify-center transition-colors relative ${
                currentPage === 'completed' ? 'bg-white text-blue-800 shadow-lg' : 'text-white'
              }`}
            >
              <span className="relative z-10 flex items-center">
                <IconCheckCircle />
                {allCompletedBreaks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {allCompletedBreaks.length}
                  </span>
                )}
              </span>
            </button>
            
            <button
              onClick={handleOpenQrScanner}
              className={`w-1/5 px-2 py-3 rounded-full flex items-center justify-center transition-colors relative text-white`}
            >
              <span className="relative z-10 flex items-center">
                <IconQrCode />
              </span>
            </button>
            
            <button
              onClick={() => setCurrentPage('settings')}
              className={`w-1/5 px-2 py-3 rounded-full flex items-center justify-center transition-colors relative ${
                currentPage === 'settings' ? 'bg-white text-blue-800 shadow-lg' : 'text-white'
              }`}
            >
              <span className="relative z-10 flex items-center">
                <IconSettings />
              </span>
            </button>
            
          </div>

          {/* --- CONTENT --- */}
          {loading && <LoadingSpinner />}
          {authError && (
            <div className="mt-4 mb-4 text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative max-w-md mx-auto" role="alert">
              <strong className="font-bold">បញ្ហា!</strong>
              <span className="block sm:inline ml-2">{authError}</span>
              <button onClick={() => setAuthError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-700">✕</button>
            </div>
          )}
            
          {/* --- PAGE 1: ស្វែងរក --- */}
          {!loading && currentPage === 'search' && (
            <div key="search-page" className="relative">
              <div className={`w-full max-w-md mx-auto transition-all duration-300 ease-in-out ${isSearchFocused ? '-translate-y-24' : 'mb-8'}`}>
                {students.length > 0 ? (
                  <div className="relative">
                    <input
                      type="text"
                      id="student-search"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onFocus={() => { setIsSearchFocused(true); setAuthError(null); }}
                      onBlur={() => { setTimeout(() => { if (!document.activeElement.classList.contains('search-result-button')) { setIsSearchFocused(false); } }, 200); }} // !! កែសម្រួល !!: លុប setSearchResults
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); setIsSearchFocused(false); } }}
                      placeholder={t.searchPlaceholder} 
                      className="block w-full px-6 py-4 bg-white/20 border border-white/30 rounded-full text-white text-lg placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
                    />
                    
                    {/* !! កែសម្រួល !!: លក្ខខណ្ឌ isSearchFocused ឥឡូវត្រូវបានគ្រប់គ្រងដោយ useMemo */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full max-w-md mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg max-h-80 overflow-y-auto">
                        {searchResults.map(student => ( 
                          <button
                            key={student.id}
                            className="search-result-button flex items-center w-full p-3 space-x-3 text-left text-gray-800 hover:bg-blue-100 first:rounded-t-2xl last:rounded-b-2xl"
                            onMouseDown={() => handleSelectStudentFromList(student)}
                          >
                            <img
                              src={student.photoUrl || `https://placehold.co/40x40/EBF4FF/76A9FA?text=${student.name ? student.name.charAt(0) : 'N'}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-bold">{student.name}</p>
                              <p className="text-sm text-gray-600">{student.idNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${student.statusColor}`}>
                                {student.statusText}
                              </p>
                              {student.passNumber && (
                                <p className="text-xs text-blue-600 font-bold">
                                  {t.statusPass}: {student.passNumber}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : ( !authError && <p className="text-gray-300 text-lg text-center">{t.studentNotFound}</p> )}
              </div>
              
              {selectedStudent && (
                <StudentCard 
                  student={selectedStudent} 
                  pageKey="search"
                  passesInUse={studentsOnBreakCount}
                  attendance={attendance}
                  now={now}
                  handleCheckOut={handleCheckOut}
                  handleCheckIn={handleCheckIn} 
                  handleOpenQrScanner={handleOpenQrScanner}
                  onDeleteClick={handleOpenDeleteModal_Simple}
                  totalPasses={totalPasses}
                  t={t}
                  checkInMode={checkInMode}
                  overtimeLimit={overtimeLimit} // !! ថ្មី !!
                />
              )}
              {/* !! កែសម្រួល !!: លក្ខខណ្ឌ isSearchFocused ឥឡូវត្រូវបានគ្រប់គ្រងដោយ useMemo */}
              {!selectedStudent && searchTerm !== "" && searchResults.length === 0 && isSearchFocused && (
                <p className="text-center text-white/70 text-lg mt-10">{t.studentNotFound}</p>
              )}
            </div>
          )}

          {/* --- PAGE 2: កំពុងសម្រាក --- */}
          {!loading && currentPage === 'onBreak' && (
            <div key="on-break-page" className="pb-10">
              {sortedStudentsOnBreak.length > 0 ? (
                sortedStudentsOnBreak.map(({ student, record, elapsedMins, isOvertime }) => (
                  <OnBreakStudentListCard 
                    key={record.id} 
                    student={student} 
                    record={record}
                    elapsedMins={elapsedMins} 
                    isOvertime={isOvertime}
                    onCheckIn={() => handleCheckIn(student.id)} 
                    handleOpenQrScanner={handleOpenQrScanner}
                    onDeleteClick={(e) => handleOpenDeleteModal_Simple(e, student, record)}
                    t={t}
                    checkInMode={checkInMode}
                  />
                ))
              ) : (
                <div className="mt-16 text-center">
                  <p className="text-white text-2xl font-semibold">{t.noStudentsOnBreak}</p>

                </div>
              )}
            </div>
          )}
          
          {/* --- PAGE 3: បានចូល --- */}
          {!loading && currentPage === 'completed' && (
            <div key="completed-page" className="pb-10">
              <CompletedListHeader 
                onAdminClick={() => setShowAdminModal(true)}
                onMultiDeleteClick={handleOpenDeleteSelected}
                onCancelMultiSelect={handleToggleSelectionMode}
                selectionCount={selectedRecords.length}
                isSelectionMode={isSelectionMode}
                t={t}
              />
              {allCompletedBreaks.length > 0 ? (
                allCompletedBreaks.map(({ student, record }) => (
                  <CompletedStudentListCard 
                    key={record.id} 
                    student={student}
                    record={record}
                    onClick={() => !isSelectionMode && null} 
                    isSelected={selectedRecords.includes(record.id)}
                    onSelect={() => handleRecordSelect(record.id)}
                    onDeleteClick={(e) => handleOpenPasswordModal(t.deleteConfirmMessage(student.name), () => handleConfirmDelete_Single(record.id))}
                    isSelectionMode={isSelectionMode}
                    t={t}
                    overtimeLimit={overtimeLimit} // !! ថ្មី !!
                  />
                ))
              ) : (
                <div className="mt-16 text-center">
                  <p className="text-white text-2xl font-semibold">{t.noStudentsCompleted}</p>
                </div>
              )}
            </div>
          )}
          
          {/* --- PAGE 5: Settings --- */}
          {!loading && currentPage === 'settings' && (
            <SettingsPage
              t={t}
              language={language}
              setLanguage={setLanguage}
              background={background}
              setBackground={setBackground}
              checkInMode={checkInMode}
              onEditCheckInMode={handleEditCheckInMode}
              onEditPassword={handleEditPassword}
              passesInUse={studentsOnBreakCount}
              totalPasses={totalPasses}
              onEditTotalPasses={handleEditTotalPasses}
              overtimeLimit={overtimeLimit} // !! ថ្មី !!
              onEditOvertimeLimit={handleEditOvertimeLimit} // !! ថ្មី !!
            />
          )}
          
          {!loading && (
             <p className="text-center text-xs text-blue-300 opacity-70 mt-8">{t.footer}</p>
           )}
        </div>
        
        {/* --- MODALS --- */}
        {modalStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setModalStudent(null)}>
            <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <StudentCard 
                student={modalStudent} 
                pageKey="modal"
                passesInUse={studentsOnBreakCount} 
                attendance={attendance}
                now={now}
                handleCheckOut={handleCheckOut}
                handleCheckIn={handleCheckIn}
                handleOpenQrScanner={handleOpenQrScanner}
                onDeleteClick={handleOpenDeleteModal_Simple}
                totalPasses={totalPasses}
                t={t}
                checkInMode={checkInMode}
                overtimeLimit={overtimeLimit} // !! ថ្មី !!
              />
              <button onClick={() => setModalStudent(null)} className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full transition-all hover:bg-white/30">
                <IconClose />
              </button>
            </div>
          </div>
        )}
        
        <DeleteConfirmationModal 
          recordToDelete={recordToDelete}
          onCancel={() => setRecordToDelete(null)}
          onConfirm={() => {
            handleConfirmDelete_Single(recordToDelete.record.id);
            setRecordToDelete(null);
          }}
          t={t}
        />
        
        <PasswordConfirmationModal 
          prompt={passwordPrompt}
          onCancel={() => setPasswordPrompt({ isOpen: false })}
          onSubmit={handlePasswordSubmit}
          t={t}
        />
        
        <AdminActionModal 
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          onSelectClick={handleToggleSelectionMode}
          onBulkClick={(mode) => handleOpenBulkDelete(mode)}
          isBulkLoading={isBulkLoading}
          bulkDeleteDate={bulkDeleteDate}
          setBulkDeleteDate={setBulkDeleteDate}
          bulkDeleteMonth={bulkDeleteMonth}
          setBulkDeleteMonth={setBulkDeleteMonth}
          t={t}
        />
        
        <QrScannerModal 
          isOpen={showQrScanner}
          onClose={() => setShowQrScanner(false)}
          onScanSuccess={handleCheckInByPassNumber}
          lastScannedInfo={lastScannedInfo}
          isScannerBusy={isScannerBusy}
          t={t}
        />
        
        <InfoAlertModal
          alertInfo={infoAlert}
          onClose={() => setInfoAlert({ isOpen: false })}
          t={t}
        />
        
        <InputPromptModal
          promptInfo={inputPrompt}
          onCancel={inputPrompt.onCancel} 
          onSubmit={inputPrompt.onSubmit}
          t={t}
        />
        
      </div>
    </React.Fragment>
  );
}

// =================================================================
// 6. START APP
// =================================================================
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);


