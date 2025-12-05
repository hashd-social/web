import { createThirdwebClient } from "thirdweb";

const clientId = process.env.REACT_APP_THIRDWEB_CLIENT_ID;

if (!clientId) {
  console.warn('⚠️ REACT_APP_THIRDWEB_CLIENT_ID not set in .env');
}

export const thirdwebClient = createThirdwebClient({
  clientId: clientId || '',
});

console.log('✅ Thirdweb client initialized with client ID');
