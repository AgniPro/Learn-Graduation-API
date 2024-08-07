const setTokensCookies = (res, accessToken, refreshToken, newAccessTokenExp, newRefreshTokenExp,uid,isauth) => {
  const accessTokenMaxAge = (newAccessTokenExp - Math.floor(Date.now() / 1000)) * 1000;
  const refreshTokenmaxAge = (newRefreshTokenExp - Math.floor(Date.now() / 1000)) * 1000;
  const isSecure = process.env.NODE_ENV === 'production' ? true : false;
  const domain = process.env.FRONTEND_HOST;
  // Set Cookie for Access Token
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isSecure, // Set to true if using HTTPS
    maxAge: accessTokenMaxAge,
    sameSite: 'None', // Adjust according to your requirements
  });

  // Set Cookie for Refresh Token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isSecure, // Set to true if using HTTPS
    maxAge: refreshTokenmaxAge,
    sameSite: 'None', // Adjust according to your requirements
  });
  // Set Cookie for is_auth
  res.cookie('is_auth',isauth, {
    httpOnly: false,
    secure: isSecure, // Set to true if using HTTPS
    maxAge: refreshTokenmaxAge,
    sameSite: 'strict', 
    domain: domain,
  });
  res.cookie('uid',uid, {
    httpOnly: false,
    secure: isSecure, // Set to true if using HTTPS
    maxAge: refreshTokenmaxAge,
    sameSite: 'strict',
    domain: domain,
  });
}

export default setTokensCookies
