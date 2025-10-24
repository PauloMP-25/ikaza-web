// Este archivo es para builds de producción (ng build --prod)
export const environment = {
  production: true,  // Modo producción: usa API real, sin mocks
  apiUrlN: 'http://localhost:3000', // URL para backend mock (si usas Opción 2)
  apiUrl: 'http://localhost:8080',
  // Si usas solo mock en servicio, esta URL no se usa
  mercadoPagoPublicKey: 'APP_USR-b043a71f-9852-4657-b10e-1d748571ba41',
  culquiPagoPublicKey: 'APP_USR-449486404366979-091720-fead70c56951f04e2f908b91b607d7e0-2694108405',

  googleMapsApiKey: 'AIzaSyA_4sVIR3dDoZWVseO1RN1auhrep8zCAb8',
  tarjetaApiKey: 'EZJWH8JgIsW4aP60MEjA3MmHLfmQsBd3',
  culqi: {
    publicKey: 'APP_USR-449486404366979-091720-fead70c56951f04e2f908b91b607d7e0-2694108405', // Clave pública de prueba
    apiUrl: 'https://api.culqi.com/v2'
  },

  // Configuración de Mercado Pago
  mercadopago: {
    publicKey: 'APP_USR-b043a71f-9852-4657-b10e-1d748571ba41', // Tu clave pública de prueba de MP
  },
  firebaseConfig: {
    apiKey: "AIzaSyDWTgWpDkbqX_xsRdkAutv_A16h3Kh7-1U",
    authDomain: "ikaza-import-6f281.firebaseapp.com",
    projectId: "ikaza-import-6f281",
    storageBucket: "ikaza-import-6f281.firebasestorage.app",
    messagingSenderId: "344860933288",
    appId: "1:344860933288:web:596622340441bd1c0b569d",
    measurementId: "G-8LLBF95RFR"
  },
  // Configuraciones específicas de producción
  enableConsoleLogging: false,
  firebaseEmulator: {
    useEmulator: false,
    authUrl: '',
    firestoreUrl: ''
  },

  // Configuraciones específicas para compras
  compras: {
    itemsPorPagina: 10,
    tiempoCancelacion: 2, // horas
    tiempoDevolucion: 30, // días
    transportadorasPermitidas: ['Olva Courier', 'Shalom', 'Cruz del Sur Cargo'],
    metodosDeRastreo: {
      'Olva Courier': 'https://www.olvacourier.com/tracking/',
      'Shalom': 'https://www.shalomempresarial.com/tracking/',
      'Cruz del Sur': 'https://www.cruzdelsur.com.pe/tracking/'
    }
  },

  // URLs de servicios externos
  external: {
    facturacionElectronica: 'https://api.sunat.gob.pe/',
    notificacionesPush: 'https://fcm.googleapis.com/',
    analytics: 'https://www.google-analytics.com/'
  }
};