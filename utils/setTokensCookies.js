const setTokensCookies = (res, accessToken, refreshToken, newAccessTokenExp, newRefreshTokenExp) => {
  const accessTokenMaxAge = (newAccessTokenExp - Math.floor(Date.now() / 1000)) * 1000;
  const refreshTokenmaxAge = (newRefreshTokenExp - Math.floor(Date.now() / 1000)) * 1000;
  const isSecure = process.env.NODE_ENV === 'production' ? true : false;
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
}

export default setTokensCookies