// This middleware will set Authorization Header and will refresh access token on expire
// if we use this middleware we won't have to explicitly make request to refresh-token api url

import refreshAccessToken from "../utils/refreshAccessToken.js";
import isTokenExpired from "../utils/isTokenExpired.js";
import setTokensCookies from "../utils/setTokensCookies.js";

const accessTokenAutoRefresh = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (accessToken && !isTokenExpired(accessToken)) {
      // Add the access token to the Authorization header
      req.headers['authorization'] = `Bearer ${accessToken}`;
      return next();
    }

    // Attempt to get a new access token using the refresh token
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      // If refresh token is also missing, throw an error
      return res.status(401).json({ error: 'Unauthorized', message: 'Session Expired' });
    }

    // Access token is expired, make a refresh token request
    const { newAccessToken, newRefreshToken, newAccessTokenExp, newRefreshTokenExp } = await refreshAccessToken(req, res);

    // Set cookies
    setTokensCookies(res, newAccessToken, newRefreshToken, newAccessTokenExp, newRefreshTokenExp);

    // Add the access token to the Authorization header
    req.headers['authorization'] = `Bearer ${newAccessToken}`;
    next();
  } catch (error) {
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Access token is missing or invalid' });
    }
  }
};

export default accessTokenAutoRefresh;