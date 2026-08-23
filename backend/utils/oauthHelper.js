const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getApiBaseUrl = () =>
  (process.env.API_URL || `http://localhost:${process.env.PORT || 5001}`).replace(/\/$/, '');

const getFrontendUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const createOAuthState = (provider) =>
  jwt.sign({ provider, nonce: crypto.randomUUID() }, process.env.JWT_SECRET, { expiresIn: '10m' });

const verifyOAuthState = (state, expectedProvider) => {
  const payload = jwt.verify(state, process.env.JWT_SECRET);
  if (payload.provider !== expectedProvider) {
    throw new Error('Invalid OAuth state');
  }
  return payload;
};

const redirectWithError = (res, message) =>
  res.redirect(`${getFrontendUrl()}/auth/callback?error=${encodeURIComponent(message)}`);

const redirectWithToken = (res, token) =>
  res.redirect(`${getFrontendUrl()}/auth/callback?token=${encodeURIComponent(token)}`);

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage,
  isEmailVerified: user.isEmailVerified,
  isOAuth: Boolean(user.isOAuth),
  githubProfile: user.githubProfile || '',
  linkedinProfile: user.linkedinProfile || '',
});

const findOrCreateOAuthUser = async ({
  email,
  name,
  picture,
  githubProfile,
  linkedinProfile,
}) => {
  if (!email) {
    throw new Error('Could not retrieve email from provider');
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      profileImage: picture || undefined,
      password: crypto.randomUUID(),
      isEmailVerified: true,
      isOAuth: true,
      githubProfile: githubProfile || '',
      linkedinProfile: linkedinProfile || '',
    });
    return user;
  }

  if (picture && (!user.profileImage || user.profileImage.includes('placeholder'))) {
    user.profileImage = picture;
  }
  if (githubProfile && !user.githubProfile) {
    user.githubProfile = githubProfile;
  }
  if (linkedinProfile && !user.linkedinProfile) {
    user.linkedinProfile = linkedinProfile;
  }
  user.isOAuth = true;
  await user.save();
  return user;
};

module.exports = {
  getApiBaseUrl,
  getFrontendUrl,
  createOAuthState,
  verifyOAuthState,
  redirectWithError,
  redirectWithToken,
  serializeUser,
  findOrCreateOAuthUser,
};
