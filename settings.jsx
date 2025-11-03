// =================================================================
// 5. SETTINGS PAGE COMPONENT
// =================================================================

// --- Component សម្រាប់ Page "Settings" ទាំងមូល ---
const SettingsPage = ({ 
  t, language, setLanguage, background, setBackground,
  checkInMode, onEditCheckInMode, onEditPassword,
  passesInUse, totalPasses, onEditTotalPasses
}) => {
  
  // ទាញ Icons ពី Global Scope
  const { 
    IconLanguage, IconPalette, IconLock, IconTicket, IconSettings,
    backgroundStyles 
  } = window.appSetup;

  return (
    <div key="settings-page" className="pb-10 text-white">
      <h2 className="text-3xl font-bold text-center mb-6">{t.settingsTitle}</h2>

      {/* --- 1. គ្រប់គ្រងកាត --- */}
      <SettingCard title={t.passManagement} icon={<IconTicket />}>
        <PassesInfoSetting
          t={t}
          passesInUse={passesInUse}
          totalPasses={totalPasses}
          onEditTotal={onEditTotalPasses}
        />
      </SettingCard>

      {/* --- 2. សុវត្ថិភាព --- */}
      <SettingCard title={t.security} icon={<IconLock />}>
        <button
          onClick={onEditPassword}
          className="w-full px-4 py-3 text-left text-lg font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          {t.changePassword}
        </button>
        
        <CheckInModeSetting
          t={t}
          checkInMode={checkInMode}
          onEditCheckInMode={onEditCheckInMode}
        />
      </SettingCard>

      {/* --- 3. ភាសា --- */}
      <SettingCard title={t.language} icon={<IconLanguage />}>
        <div className="flex space-x-2">
          <button
            onClick={() => setLanguage('km')}
            className={`w-1/2 py-3 rounded-lg font-bold ${language === 'km' ? 'bg-white text-blue-800' : 'bg-white/20 text-white'}`}
          >
            ខ្មែរ (KM)
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`w-1/2 py-3 rounded-lg font-bold ${language === 'en' ? 'bg-white text-blue-800' : 'bg-white/20 text-white'}`}
          >
            English (EN)
          </button>
        </div>
      </SettingCard>
      
      {/* --- 4. ផ្ទៃខាងក្រោយ --- */}
      <SettingCard title={t.background} icon={<IconPalette />}>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(backgroundStyles).map(key => (
            <button
              key={key}
              onClick={() => setBackground(key)}
              className={`h-20 rounded-lg ${backgroundStyles[key]} ${background === key ? 'ring-4 ring-white' : 'opacity-70'}`}
            >
              <span className="bg-black/20 px-2 py-1 rounded-full text-xs">{key}</span>
            </button>
          ))}
        </div>
      </SettingCard>

    </div>
  );
};

// --- Component តូចៗ សម្រាប់ Settings ---
const SettingCard = ({ title, icon, children }) => (
  <div className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-3xl shadow-xl p-6 mb-6">
    <div className="flex items-center mb-4">
      <div className="p-2 bg-white/20 rounded-full">
        {icon}
      </div>
      <h3 className="text-xl font-bold ml-4">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// --- Component សម្រាប់ បង្ហាញព័ត៌មានកាត ---
const PassesInfoSetting = ({ t, passesInUse, totalPasses, onEditTotal }) => {
  const { IconPencil } = window.appSetup;
  const passesAvailable = totalPasses - passesInUse;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg p-6 text-center">
      <div className="flex justify-around text-white">
        <div className="text-center">
          <p className="text-4xl font-bold text-red-300">{passesInUse}</p>
          <p className="text-lg text-blue-200">{t.passInUse}</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-green-300">{passesAvailable}</p>
          <p className="text-lg text-blue-200">{t.passAvailable}</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold">{totalPasses}</p>
          <p className="text-lg text-blue-200">{t.passTotal}</p>
        </div>
      </div>
      <div className="mt-6 border-t border-white/20 pt-4">
        <button
          onClick={onEditTotal}
          className="flex items-center justify-center w-full px-4 py-3 rounded-full text-lg text-white font-bold transition-all shadow-lg bg-blue-500 hover:bg-blue-600"
        >
          <IconPencil />
          {t.editPassTotal}
        </button>
      </div>
    </div>
  );
};

// --- Component សម្រាប់ ប្ដូររបៀប Check-in ---
const CheckInModeSetting = ({ t, checkInMode, onEditCheckInMode }) => {
  const { IconCheckIn, IconCheckOut } = window.appSetup;
  
  return (
    <div className="mt-4">
      <p className="text-sm text-blue-200 mb-2">{t.checkInMethod}</p>
      {checkInMode === 'scan' ? (
        <button 
          onClick={onEditCheckInMode}
          className="flex items-center justify-center w-full px-4 py-3 rounded-full text-lg text-white font-bold transition-all shadow-lg bg-blue-500 hover:bg-blue-600"
        >
          <IconCheckIn className="w-6 h-6 mr-2" />
          {t.checkInMethodScan}
        </button>
      ) : (
        <button 
          onClick={onEditCheckInMode}
          className="flex items-center justify-center w-full px-4 py-3 rounded-full text-lg text-white font-bold transition-all shadow-lg bg-green-500 hover:bg-green-600"
        >
          <IconCheckOut className="w-6 h-6 mr-2" />
          {t.checkInMethodAuto}
        </button>
      )}
    </div>
  );
};


// ភ្ជាប់ទៅ Global Scope
window.SettingsPage = SettingsPage;
