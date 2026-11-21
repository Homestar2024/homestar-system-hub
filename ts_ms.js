// Homestar HQ - Microsoft sign-in config (Entra app 'Homestar HQ', single tenant, SPA, no secret). Public ids only.
export const MS = {
  scopes: ['Files.ReadWrite.All', 'User.Read'],
  config: {
    auth: { clientId: 'e887d3e2-b2f3-428e-b077-157d19227ea3', authority: 'https://login.microsoftonline.com/1e43fe4b-e7f8-4cbb-8078-6d8fb5fdd406',
      redirectUri: new URL('./msal.html', document.baseURI).href, navigateToLoginRequestUrl: false },
    cache: { cacheLocation: 'localStorage' }
  },
  lib: 'https://esm.sh/@azure/msal-browser@3.27.0'
};
