export type Locale = 'en' | 'de' | 'es' | 'tr';

export const LOCALE_OPTIONS: { value: Locale; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
];

type TranslationMap = Record<string, { en: string; de: string; es: string; tr: string }>;

const translations: TranslationMap = {
  // Common
  error: { en: 'Error', de: 'Fehler', es: 'Error', tr: 'Hata' },
  // Language screen
  selectLanguage: { en: 'Select your language', de: 'Wählen Sie Ihre Sprache', es: 'Seleccione su idioma', tr: 'Dilinizi seçin' },
  next: { en: 'Next', de: 'Weiter', es: 'Siguiente', tr: 'İleri' },

  // Login
  login: { en: 'Log in', de: 'Anmelden', es: 'Iniciar sesión', tr: 'Giriş Yap' },
  email: { en: 'Email', de: 'E-Mail', es: 'Correo electrónico', tr: 'E-posta' },
  password: { en: 'Password', de: 'Passwort', es: 'Contraseña', tr: 'Şifre' },
  errorEnterEmailPassword: { en: 'Please enter email and password.', de: 'Bitte E-Mail und Passwort eingeben.', es: 'Introduzca el correo y la contraseña.', tr: 'E-posta ve şifre giriniz.' },
  loginError: { en: 'Login error', de: 'Anmeldefehler', es: 'Error de inicio de sesión', tr: 'Giriş hatası' },
  noAccount: { en: "Don't have an account? ", de: 'Noch kein Konto? ', es: '¿No tiene cuenta? ', tr: 'Hesabınız yok mu? ' },
  registerLink: { en: 'Sign up', de: 'Registrieren', es: 'Registrarse', tr: 'Kayıt olun' },

  // Register
  register: { en: 'Sign up', de: 'Registrieren', es: 'Registrarse', tr: 'Kayıt Ol' },
  registerTitle: { en: 'Sign up', de: 'Registrieren', es: 'Registrarse', tr: 'Kayıt Ol' },
  fillAllFields: { en: 'Please fill in all fields.', de: 'Bitte füllen Sie alle Felder aus.', es: 'Rellene todos los campos.', tr: 'Tüm alanları doldurunuz.' },
  passwordsDontMatch: { en: 'Passwords do not match.', de: 'Passwörter stimmen nicht überein.', es: 'Las contraseñas no coinciden.', tr: 'Şifreler eşleşmiyor.' },
  passwordMinLength: { en: 'Password must be at least 6 characters.', de: 'Passwort muss mindestens 6 Zeichen haben.', es: 'La contraseña debe tener al menos 6 caracteres.', tr: 'Şifre en az 6 karakter olmalıdır.' },
  confirmPassword: { en: 'Confirm password', de: 'Passwort bestätigen', es: 'Confirmar contraseña', tr: 'Şifre tekrar' },
  passwordPlaceholder: { en: 'Password (min. 6 characters)', de: 'Passwort (min. 6 Zeichen)', es: 'Contraseña (mín. 6 caracteres)', tr: 'Şifre (min. 6 karakter)' },
  registerError: { en: 'Registration error', de: 'Registrierungsfehler', es: 'Error de registro', tr: 'Kayıt hatası' },
  emailVerification: { en: 'Email verification', de: 'E-Mail-Bestätigung', es: 'Verificación de correo', tr: 'E-posta doğrulama' },
  registerSuccessVerify: { en: 'Registration successful. Verify your account via the link sent to your email.', de: 'Registrierung erfolgreich. Bestätigen Sie Ihr Konto über den Link in Ihrer E-Mail.', es: 'Registro exitoso. Verifique su cuenta mediante el enlace enviado a su correo.', tr: 'Kayıt başarılı. E-posta adresinize gelen link ile hesabınızı doğrulayın.' },
  haveAccount: { en: 'Already have an account? ', de: 'Bereits ein Konto? ', es: '¿Ya tiene cuenta? ', tr: 'Zaten hesabınız var mı? ' },
  loginLink: { en: 'Log in', de: 'Anmelden', es: 'Iniciar sesión', tr: 'Giriş yapın' },

  // Profile
  userProfile: { en: 'User Profile', de: 'Benutzerprofil', es: 'Perfil de usuario', tr: 'User Profile' },
  language: { en: 'Language', de: 'Sprache', es: 'Idioma', tr: 'Dil' },
  changeLanguage: { en: 'Change app language', de: 'App-Sprache ändern', es: 'Cambiar idioma de la app', tr: 'Uygulama dilini değiştir' },
  routineStreak: { en: 'Routine streak', de: 'Routine-Serie', es: 'Racha de rutina', tr: 'Rutin Serisi' },
  days: { en: 'Days', de: 'Tage', es: 'Días', tr: 'Gün' },
  productsUsed: { en: 'Products used', de: 'Verwendete Produkte', es: 'Productos usados', tr: 'Kullanılan Ürün' },
  thisWeek: { en: '+ this week', de: '+ diese Woche', es: '+ esta semana', tr: '+ bu hafta' },
  skinProfile: { en: 'My skin profile', de: 'Mein Hautprofil', es: 'Mi perfil de piel', tr: 'Cilt Profilim' },
  addSkinType: { en: 'Add skin type', de: 'Hauttyp hinzufügen', es: 'Añadir tipo de piel', tr: 'Cilt tipi ekleyin' },
  memberSince: { en: 'Member since', de: 'Mitglied seit', es: 'Miembro desde', tr: 'tarihinden beri üye' },
  updateProfileSurvey: { en: 'Update profile survey', de: 'Profilumfrage aktualisieren', es: 'Actualizar encuesta de perfil', tr: 'Profil Anketini Güncelle' },
  signOut: { en: 'Sign out', de: 'Abmelden', es: 'Cerrar sesión', tr: 'Çıkış Yap' },
  primaryConcerns: { en: 'Primary concerns', de: 'Hauptanliegen', es: 'Preocupaciones principales', tr: 'Birincil Endişeler' },
  sensitivity: { en: 'Sensitivity', de: 'Empfindlichkeit', es: 'Sensibilidad', tr: 'Hassasiyet' },
  climate: { en: 'Climate', de: 'Klima', es: 'Clima', tr: 'İklim' },
  allergies: { en: 'Allergies', de: 'Allergien', es: 'Alergias', tr: 'Alerjiler' },
  sensitive: { en: 'Sensitive', de: 'Empfindlich', es: 'Sensible', tr: 'Hassas' },
  humidTropical: { en: 'Humid / Tropical', de: 'Feucht / Tropisch', es: 'Húmedo / Tropical', tr: 'Nemli / Tropikal' },
  parabensFragrance: { en: 'Paraben, Fragrance', de: 'Paraben, Duft', es: 'Parabeno, Fragancia', tr: 'Paraben, Parfüm' },
  acneSpot: { en: 'Acne, Spot', de: 'Akne, Flecken', es: 'Acné, Mancha', tr: 'Akne, Leke' },

  // Routine
  routineMorning: { en: 'Morning', de: 'Morgen', es: 'Mañana', tr: 'Sabah' },
  routineEvening: { en: 'Evening', de: 'Abend', es: 'Noche', tr: 'Akşam' },
  today: { en: 'Today', de: 'Heute', es: 'Hoy', tr: 'Bugün' },
  progress: { en: 'PROGRESS', de: 'FORTSCHRITT', es: 'PROGRESO', tr: 'İLERLEME' },
  stepsCompleted: { en: 'steps completed', de: 'Schritte abgeschlossen', es: 'pasos completados', tr: 'adım tamamlandı' },
  routineEmpty: { en: "You haven't added any products yet. Add with +.", de: 'Noch keine Produkte hinzugefügt. Mit + hinzufügen.', es: 'Aún no has añadido productos. Añade con +.', tr: 'Henüz ürün eklemediniz. + ile ekleyin.' },
  deleteStepTitle: { en: 'Delete step', de: 'Schritt löschen', es: 'Eliminar paso', tr: 'Adımı sil' },
  deleteStepMessage: { en: 'Remove this product from the routine?', de: 'Dieses Produkt aus der Routine entfernen?', es: '¿Quitar este producto de la rutina?', tr: 'Bu ürünü rutinden kaldırmak istiyor musunuz?' },
  cancel: { en: 'Cancel', de: 'Abbrechen', es: 'Cancelar', tr: 'İptal' },
  delete: { en: 'Delete', de: 'Löschen', es: 'Eliminar', tr: 'Sil' },
  step: { en: 'Step', de: 'Schritt', es: 'Paso', tr: 'Adım' },
  product: { en: 'Product', de: 'Produkt', es: 'Producto', tr: 'Ürün' },
  saveCompletionFailed: { en: 'Could not save completion.', de: 'Abschluss konnte nicht gespeichert werden.', es: 'No se pudo guardar el progreso.', tr: 'Tamamlama kaydedilemedi.' },
  loadRoutineFailed: { en: 'Could not load routine.', de: 'Routine konnte nicht geladen werden.', es: 'No se pudo cargar la rutina.', tr: 'Rutin yüklenemedi.' },
  saveOrderFailed: { en: 'Could not save order.', de: 'Reihenfolge konnte nicht gespeichert werden.', es: 'No se pudo guardar el orden.', tr: 'Sıra kaydedilemedi.' },
  deleteFailed: { en: 'Could not delete.', de: 'Löschen fehlgeschlagen.', es: 'No se pudo eliminar.', tr: 'Silinemedi.' },
  dayMon: { en: 'Mon', de: 'Mo', es: 'Lun', tr: 'Pzt' },
  dayTue: { en: 'Tue', de: 'Di', es: 'Mar', tr: 'Sal' },
  dayWed: { en: 'Wed', de: 'Mi', es: 'Mié', tr: 'Çar' },
  dayThu: { en: 'Thu', de: 'Do', es: 'Jue', tr: 'Per' },
  dayFri: { en: 'Fri', de: 'Fr', es: 'Vie', tr: 'Cum' },
  daySat: { en: 'Sat', de: 'Sa', es: 'Sáb', tr: 'Cmt' },
  daySun: { en: 'Sun', de: 'So', es: 'Dom', tr: 'Paz' },

  // Shelf
  shelfMyShelf: { en: 'My Shelf', de: 'Mein Regal', es: 'Mi estante', tr: 'Rafım' },
  shelfWishlist: { en: 'Wishlist', de: 'Wunschliste', es: 'Lista de deseos', tr: 'İstek Listesi' },
  shelfEmpty: { en: 'Finished', de: 'Leer', es: 'Terminados', tr: 'Bitenler' },
  shelfLoadFailed: { en: 'Could not load list.', de: 'Liste konnte nicht geladen werden.', es: 'No se pudo cargar la lista.', tr: 'Liste yüklenemedi.' },
  shelfRemove: { en: 'Remove from list', de: 'Aus Liste entfernen', es: 'Quitar de la lista', tr: 'Listeden çıkar' },
  shelfMoveToEmpty: { en: 'Move to finished', de: 'Zu „Leer“ verschieben', es: 'Mover a terminados', tr: 'Bitenlere taşı' },
  shelfRemoveFailed: { en: 'Could not remove.', de: 'Entfernen fehlgeschlagen.', es: 'No se pudo quitar.', tr: 'Kaldırılamadı.' },
  shelfUpdateFailed: { en: 'Could not update.', de: 'Aktualisierung fehlgeschlagen.', es: 'No se pudo actualizar.', tr: 'Güncellenemedi.' },
  shelfWhatToDo: { en: 'What would you like to do?', de: 'Was möchten Sie tun?', es: '¿Qué desea hacer?', tr: 'Ne yapmak istiyorsunuz?' },
  shelfEmptyOpened: { en: "You don't have any products on your shelf yet.", de: 'Noch keine Produkte auf Ihrem Regal.', es: 'Aún no tienes productos en tu estante.', tr: 'Henüz rafınızda ürün yok.' },
  shelfEmptyWishlist: { en: 'Your wishlist is empty.', de: 'Ihre Wunschliste ist leer.', es: 'Tu lista de deseos está vacía.', tr: 'İstek listeniz boş.' },
  shelfEmptyFinished: { en: 'No finished products.', de: 'Keine leeren Produkte.', es: 'No hay productos terminados.', tr: 'Biten ürün yok.' },
  shelfAddFromProducts: { en: 'Add from Products page.', de: 'Über die Produktseite hinzufügen.', es: 'Añade desde la página Productos.', tr: 'Ürünler sayfasından ekleyin.' },
  shelfAddProduct: { en: 'Add Product', de: 'Produkt hinzufügen', es: 'Añadir producto', tr: 'Ürün Ekle' },
  // Shelf badges
  shelfBadge_expired: { en: 'Expired', de: 'Abgelaufen', es: 'Caducado', tr: 'Süresi doldu' },
  shelfBadge_month: { en: 'mo', de: 'Mo', es: 'mes', tr: 'ay' },
  shelfBadge_week: { en: 'wk', de: 'Wo', es: 'sem', tr: 'hafta' },
  shelfBadge_endingSoon: { en: 'Ending soon', de: 'Läuft bald ab', es: 'Por terminar', tr: 'Yakında biter' },
  shelfBadge_addedToday: { en: 'Added today', de: 'Heute hinzugefügt', es: 'Añadido hoy', tr: 'Bugün eklendi' },
  shelfBadge_dayAgo: { en: '1 day ago', de: 'Vor 1 Tag', es: 'Hace 1 día', tr: '1 gün önce' },
  shelfBadge_daysAgo: { en: 'days ago', de: 'Tage her', es: 'días atrás', tr: 'gün önce' },
  shelfBadge_monthAgo: { en: 'month ago', de: 'Monat her', es: 'mes atrás', tr: 'ay önce' },
  shelfBadge_monthsAgo: { en: 'months ago', de: 'Monate her', es: 'meses atrás', tr: 'ay önce' },
  shelfBadge_wishlist: { en: 'Wishlist', de: 'Wunschliste', es: 'Lista de deseos', tr: 'İstek listesi' },
  shelfBadge_finished: { en: 'Finished', de: 'Leer', es: 'Terminado', tr: 'Bitti' },
  shelfBadge_onShelf: { en: 'On shelf', de: 'Im Regal', es: 'En estante', tr: 'Rafımda' },

  // Products (Product Finder)
  productsTitle: { en: 'Product Finder', de: 'Produktfinder', es: 'Buscador de productos', tr: 'Product Finder' },
  productsSearchPlaceholder: { en: 'Search product, brand, ingredient...', de: 'Produkt, Marke, Inhaltsstoff suchen...', es: 'Buscar producto, marca, ingrediente...', tr: 'Ürün, marka, içerik ara...' },
  productsResults: { en: 'RESULTS', de: 'ERGEBNISSE', es: 'RESULTADOS', tr: 'SONUÇ' },
  productsLoadFailed: { en: 'Could not load products.', de: 'Produkte konnten nicht geladen werden.', es: 'No se pudieron cargar los productos.', tr: 'Ürünler yüklenemedi.' },
  productsAddToRoutine: { en: 'Add to routine', de: 'Zur Routine hinzufügen', es: 'Añadir a rutina', tr: 'Rutine Ekle' },
  productsMatch: { en: 'Match', de: 'Übereinstimmung', es: 'Coincidencia', tr: 'Eşleşme' },
  productsNoResults: { en: 'No products found.', de: 'Keine Produkte gefunden.', es: 'No se encontraron productos.', tr: 'Ürün bulunamadı.' },
  productsNoResultsHint: { en: 'Change search criteria or add your own product.', de: 'Suchkriterien ändern oder eigenes Produkt hinzufügen.', es: 'Cambie los criterios de búsqueda o añada su propio producto.', tr: 'Arama kriterlerini değiştirin veya kendi ürününüzü ekleyin.' },
  productsAddProduct: { en: 'Add Product', de: 'Produkt hinzufügen', es: 'Añadir producto', tr: 'Ürün Ekle' },
  productsAddBack: { en: 'Back', de: 'Zurück', es: 'Atrás', tr: 'Geri' },
  // Add to routine alert
  productsAddToRoutineTitle: { en: 'Add to routine', de: 'Zur Routine hinzufügen', es: 'Añadir a rutina', tr: 'Rutine Ekle' },
  productsWhichRoutine: { en: 'Which routine should this be added to?', de: 'Zu welcher Routine hinzufügen?', es: '¿A qué rutina añadirlo?', tr: 'hangi rutine eklensin?' },
  productsMorningRoutine: { en: 'Morning routine', de: 'Morgenroutine', es: 'Rutina mañana', tr: 'Sabah Rutini' },
  productsEveningRoutine: { en: 'Evening routine', de: 'Abendroutine', es: 'Rutina noche', tr: 'Akşam Rutini' },
  productsLoginRequired: { en: 'Please log in.', de: 'Bitte anmelden.', es: 'Inicie sesión.', tr: 'Giriş yapmanız gerekiyor.' },
  productsAddedToMorning: { en: 'Added to morning routine.', de: 'Zur Morgenroutine hinzugefügt.', es: 'Añadido a rutina mañana.', tr: 'Sabah rutinine eklendi.' },
  productsAddedToEvening: { en: 'Added to evening routine.', de: 'Zur Abendroutine hinzugefügt.', es: 'Añadido a rutina noche.', tr: 'Akşam rutinine eklendi.' },
  productsAddToRoutineFailed: { en: 'Could not add to routine.', de: 'Konnte nicht zur Routine hinzugefügt werden.', es: 'No se pudo añadir a la rutina.', tr: 'Rutine eklenemedi.' },
  productsUpdated: { en: 'Updated', de: 'Aktualisiert', es: 'Actualizado', tr: 'Güncellendi' },
  productsAdded: { en: 'Added', de: 'Hinzugefügt', es: 'Añadido', tr: 'Eklendi' },
  productsMovedToShelf: { en: 'Moved to your shelf.', de: 'Auf Ihr Regal verschoben.', es: 'Movido a tu estante.', tr: 'Rafına taşındı.' },
  productsMovedToWishlist: { en: 'Moved to wishlist.', de: 'Zur Wunschliste verschoben.', es: 'Movido a lista de deseos.', tr: 'İstek listesine taşındı.' },
  productsAddedToShelf: { en: 'Added to your shelf.', de: 'Zu Ihrem Regal hinzugefügt.', es: 'Añadido a tu estante.', tr: 'Rafına eklendi.' },
  productsAddedToWishlist: { en: 'Added to wishlist.', de: 'Zur Wunschliste hinzugefügt.', es: 'Añadido a lista de deseos.', tr: 'İstek listesine eklendi.' },
  productsAddFailed: { en: 'Could not add.', de: 'Hinzufügen fehlgeschlagen.', es: 'No se pudo añadir.', tr: 'Eklenemedi.' },
  // Product categories (filter + display)
  prodCat_all: { en: 'All products', de: 'Alle Produkte', es: 'Todos los productos', tr: 'Tüm Ürünler' },
  prodCat_cleanser: { en: 'Cleanser', de: 'Reiniger', es: 'Limpiador', tr: 'Temizleyici' },
  prodCat_toner: { en: 'Toner', de: 'Toner', es: 'Tónico', tr: 'Tonik' },
  prodCat_serum: { en: 'Serum', de: 'Serum', es: 'Suero', tr: 'Serum' },
  prodCat_moisturizer: { en: 'Moisturizer', de: 'Feuchtigkeitscreme', es: 'Hidratante', tr: 'Nemlendirici' },
  prodCat_sunscreen: { en: 'Sunscreen', de: 'Sonnencreme', es: 'Protector solar', tr: 'Güneş Kremi' },
  prodCat_mask: { en: 'Mask', de: 'Maske', es: 'Mascarilla', tr: 'Maske' },
  prodCat_eye_cream: { en: 'Eye cream', de: 'Augencreme', es: 'Contorno de ojos', tr: 'Göz Kremi' },
  prodCat_treatment: { en: 'Treatment', de: 'Behandlung', es: 'Tratamiento', tr: 'Tedavi' },
  prodCat_other: { en: 'Other', de: 'Sonstige', es: 'Otro', tr: 'Diğer' },

  // Products Add (Ürün / Aksiyon Ekle)
  addProductTitle: { en: 'Add Product / Action', de: 'Produkt / Aktion hinzufügen', es: 'Añadir producto / acción', tr: 'Ürün / Aksiyon Ekle' },
  addProductCancel: { en: 'Cancel', de: 'Abbrechen', es: 'Cancelar', tr: 'İptal' },
  addProductSubmit: { en: 'Submit', de: 'Absenden', es: 'Enviar', tr: 'Gönder' },
  addProductTypeLabel: { en: 'Product / Action type', de: 'Produkt- / Aktionstyp', es: 'Tipo de producto / acción', tr: 'Ürün / Aksiyon Tipi' },
  addProductCommercial: { en: 'COMMERCIAL PRODUCT', de: 'HANDELSPRODUKT', es: 'PRODUCTO COMERCIAL', tr: 'TİCARİ ÜRÜN' },
  addProductCommercialDesc: { en: 'Skincare, hair, nail or body care, supplements', de: 'Haut-, Haar-, Nagel- oder Körperpflege, Nahrungsergänzung', es: 'Cuidado facial, cabello, uñas o cuerpo, suplementos', tr: 'Cilt, saç, tırnak veya vücut bakımı, takviye' },
  addProductOther: { en: 'OTHER', de: 'SONSTIGES', es: 'OTRO', tr: 'DİĞER' },
  addProductOtherDesc: { en: 'Activity, DIY, fitness, hobby, learning, housework', de: 'Aktivität, DIY, Fitness, Hobby, Lernen, Hausarbeit', es: 'Actividad, DIY, fitness, hobby, aprendizaje, tareas del hogar', tr: 'Aktivite, DIY, fitness, hobi, öğrenme, ev işi' },
  addProductCategory: { en: 'Category:', de: 'Kategorie:', es: 'Categoría:', tr: 'Kategori:' },
  addProductNone: { en: 'None', de: 'Keine', es: 'Ninguno', tr: 'Yok' },
  addProductBrand: { en: 'Brand / Company:', de: 'Marke / Firma:', es: 'Marca / Empresa:', tr: 'Marka / Şirket:' },
  addProductBrandPlaceholder: { en: 'Brand name...', de: 'Markenname...', es: 'Nombre de marca...', tr: 'Marka adı...' },
  addProductName: { en: 'Name:', de: 'Name:', es: 'Nombre:', tr: 'Ad:' },
  addProductNamePlaceholder: { en: 'Product name...', de: 'Produktname...', es: 'Nombre del producto...', tr: 'Ürün adı...' },
  addProductPrivacy: { en: 'Make private (only you can search and track)', de: 'Privat (nur Sie können suchen und verfolgen)', es: 'Hacer privado (solo usted puede buscar y seguir)', tr: 'Gizli yap (sadece siz arayıp takip edebilirsiniz)' },
  addProductRatingQuestion: { en: 'Have you tried this product? How would you rate it?', de: 'Haben Sie dieses Produkt schon ausprobiert? Wie bewerten Sie es?', es: '¿Ya probó este producto? ¿Cómo lo puntuaría?', tr: 'Bu ürünü zaten denediniz mi? Evetse nasıl puanlarsınız?' },
  addProductAdditional: { en: 'ADDITIONAL INFO', de: 'ZUSÄTZLICHE INFO', es: 'INFO ADICIONAL', tr: 'EK BİLGİ' },
  addProductAdditionalSub: { en: 'Optional. Add what you like :)', de: 'Optional. Fügen Sie hinzu, was Sie möchten :)', es: 'Opcional. Añada lo que quiera :)', tr: 'Zorunlu değil. İstediğinizi ekleyin :)' },
  addProductSelectCategoryFirst: { en: '* Select a category first', de: '* Zuerst Kategorie wählen', es: '* Seleccione primero una categoría', tr: '* Önce kategori seçin' },
  addProductIngredients: { en: 'Ingredients / Notes', de: 'Inhaltsstoffe / Notizen', es: 'Ingredientes / Notas', tr: 'İçerik / Notlar' },
  addProductIngredientsPlaceholder: { en: 'Ingredient list or notes', de: 'Inhaltsstoffliste oder Notizen', es: 'Lista de ingredientes o notas', tr: 'İçerik listesi veya notlar' },
  addProductImageUrl: { en: 'Image URL', de: 'Bild-URL', es: 'URL de imagen', tr: 'Görsel URL' },
  addProductModalTitle: { en: 'Select category', de: 'Kategorie wählen', es: 'Seleccionar categoría', tr: 'Kategori Seçin' },
  addProductModalClose: { en: 'Close', de: 'Schließen', es: 'Cerrar', tr: 'Kapat' },
  addProductErrorName: { en: 'Enter product name.', de: 'Produktname eingeben.', es: 'Introduzca el nombre del producto.', tr: 'Ürün adı girin.' },
  addProductSaved: { en: 'Saved', de: 'Gespeichert', es: 'Guardado', tr: 'Kaydedildi' },
  addProductSavedAndRoutine: { en: 'Product added and included in routine.', de: 'Produkt hinzugefügt und zur Routine hinzugefügt.', es: 'Producto añadido e incluido en la rutina.', tr: 'Ürün eklendi ve rutine dahil edildi.' },
  addProductSavedOnly: { en: 'Product added.', de: 'Produkt hinzugefügt.', es: 'Producto añadido.', tr: 'Ürün eklendi.' },
  addProductOk: { en: 'OK', de: 'OK', es: 'OK', tr: 'Tamam' },
  addProductSaveFailed: { en: 'Could not add product.', de: 'Produkt konnte nicht hinzugefügt werden.', es: 'No se pudo añadir el producto.', tr: 'Ürün eklenemedi.' },
};

export type TranslationKey = keyof typeof translations;

export function getTranslation(locale: Locale, key: TranslationKey): string {
  const entry = translations[key];
  if (!entry) return key;
  const value = entry[locale];
  return value ?? entry.tr ?? key;
}

export function createT(locale: Locale) {
  return (key: TranslationKey): string => getTranslation(locale, key);
}
