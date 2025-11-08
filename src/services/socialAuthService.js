const axios = require('axios');
const appleSignin = require('apple-signin-auth');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwt');
const { oauthConfig } = require('../config/oauth');
const logger = require('../utils/logger');

/**
 * Exchange Google authorization code for access token and fetch user info
 */
const authenticateGoogle = async (code) => {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(oauthConfig.google.tokenURL, {
      client_id: oauthConfig.google.clientId,
      client_secret: oauthConfig.google.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: oauthConfig.google.redirectUri,
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('Failed to obtain access token from Google');
    }

    // Fetch user info
    const userInfoResponse = await axios.get(oauthConfig.google.userInfoURL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const profile = {
      id: userInfoResponse.data.id,
      email: userInfoResponse.data.email,
      name: userInfoResponse.data.name || userInfoResponse.data.given_name || 'User',
      picture: userInfoResponse.data.picture,
      verified: userInfoResponse.data.verified_email || false,
    };

    return await findOrCreateSocialUser('google', profile);
  } catch (error) {
    logger.error('Google authentication error', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error('Google authentication failed');
  }
};

/**
 * Authenticate with Apple Sign In
 * Apple uses JWT-based authentication, not OAuth flow
 */
const authenticateApple = async (idToken, user) => {
  try {
    // Verify Apple idToken
    const appleIdTokenClaims = await appleSignin.verifyIdToken(idToken, {
      audience: oauthConfig.apple.clientId,
      ignoreExpiration: false,
    });

    // Extract user info from token
    const profile = {
      id: appleIdTokenClaims.sub,
      email: appleIdTokenClaims.email || user?.email || null,
      name: user?.name || user?.fullName?.givenName || 'User',
      verified: true, // Apple tokens are pre-verified
    };

    // Note: Apple only provides email/name on first sign-in
    // Subsequent sign-ins may not include this data
    return await findOrCreateSocialUser('apple', profile);
  } catch (error) {
    logger.error('Apple authentication error', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error('Apple authentication failed');
  }
};

/**
 * Exchange Instagram authorization code for access token and fetch user info
 */
const authenticateInstagram = async (code) => {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(oauthConfig.instagram.tokenURL, {
      client_id: oauthConfig.instagram.clientId,
      client_secret: oauthConfig.instagram.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: oauthConfig.instagram.redirectUri,
      code,
    });

    const { access_token, user_id } = tokenResponse.data;

    if (!access_token || !user_id) {
      throw new Error('Failed to obtain access token from Instagram');
    }

    // Fetch user info
    const userInfoResponse = await axios.get(oauthConfig.instagram.userInfoURL, {
      params: {
        fields: 'id,username,account_type',
        access_token,
      },
    });

    const profile = {
      id: userInfoResponse.data.id || user_id,
      username: userInfoResponse.data.username,
      email: null, // Instagram Basic Display API doesn't provide email
      name: userInfoResponse.data.username || 'User',
      picture: null, // Would need additional API call for profile picture
      verified: false,
    };

    return await findOrCreateSocialUser('instagram', profile);
  } catch (error) {
    logger.error('Instagram authentication error', {
      error: error.message,
      stack: error.stack,
    });
    throw new Error('Instagram authentication failed');
  }
};

/**
 * Find existing user or create new user for social authentication
 */
const findOrCreateSocialUser = async (provider, profile) => {
  try {
    // First, try to find user by socialId
    let user = await User.findOne({ socialId: profile.id, authProvider: provider });

    // If not found, try to find by email (for account linking)
    if (!user && profile.email) {
      user = await User.findOne({ email: profile.email.toLowerCase() });
    }

    if (user) {
      // Update social ID if not set
      if (!user.socialId && profile.id) {
        user.socialId = profile.id;
        user.authProvider = provider;
      }

      // Update profile image if available and not set
      if (profile.picture && !user.profile_image) {
        user.profile_image = profile.picture;
      }

      // Update name if changed
      if (profile.name && user.name !== profile.name) {
        user.name = profile.name;
      }

      // Ensure user is verified (social auth users are auto-verified)
      user.verified = true;

      await user.save();
    } else {
      // Create new user
      if (!profile.email && provider !== 'instagram') {
        throw new Error(`Email is required for ${provider} authentication`);
      }

      user = new User({
        name: profile.name || 'User',
        email: profile.email ? profile.email.toLowerCase() : `${profile.id}@${provider}.social`,
        authProvider: provider,
        socialId: profile.id,
        verified: true, // Social auth users are auto-verified
        profile_image: profile.picture || null,
      });

      await user.save();
    }

    // Generate JWT tokens
    const tokens = generateTokens(user._id);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        authProvider: user.authProvider,
      },
      ...tokens,
    };
  } catch (error) {
    logger.error('findOrCreateSocialUser error', {
      error: error.message,
      stack: error.stack,
      provider,
    });
    throw error;
  }
};

/**
 * Get profile from Google code (for account linking)
 */
const getGoogleProfile = async (code) => {
  try {
    const tokenResponse = await axios.post(oauthConfig.google.tokenURL, {
      client_id: oauthConfig.google.clientId,
      client_secret: oauthConfig.google.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: oauthConfig.google.redirectUri,
    });

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      throw new Error('Failed to obtain access token from Google');
    }

    const userInfoResponse = await axios.get(oauthConfig.google.userInfoURL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    return {
      id: userInfoResponse.data.id,
      email: userInfoResponse.data.email,
      name: userInfoResponse.data.name,
    };
  } catch (error) {
    logger.error('getGoogleProfile error', { error: error.message });
    throw new Error('Failed to get Google profile');
  }
};

/**
 * Get profile from Apple idToken (for account linking)
 */
const getAppleProfile = async (idToken, user) => {
  try {
    const appleIdTokenClaims = await appleSignin.verifyIdToken(idToken, {
      audience: oauthConfig.apple.clientId,
      ignoreExpiration: false,
    });

    return {
      id: appleIdTokenClaims.sub,
      email: appleIdTokenClaims.email || user?.email || null,
      name: user?.name || user?.fullName?.givenName || null,
    };
  } catch (error) {
    logger.error('getAppleProfile error', { error: error.message });
    throw new Error('Failed to get Apple profile');
  }
};

/**
 * Get profile from Instagram code (for account linking)
 */
const getInstagramProfile = async (code) => {
  try {
    const tokenResponse = await axios.post(oauthConfig.instagram.tokenURL, {
      client_id: oauthConfig.instagram.clientId,
      client_secret: oauthConfig.instagram.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: oauthConfig.instagram.redirectUri,
      code,
    });

    const { access_token, user_id } = tokenResponse.data;
    if (!access_token || !user_id) {
      throw new Error('Failed to obtain access token from Instagram');
    }

    return {
      id: user_id,
      email: null, // Instagram doesn't provide email
      name: null,
    };
  } catch (error) {
    logger.error('getInstagramProfile error', { error: error.message });
    throw new Error('Failed to get Instagram profile');
  }
};

/**
 * Link a social account to an existing user
 */
const linkSocialAccount = async (userId, provider, profile) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if account is already linked
    const existingLink = user.socialAccounts.find(
      (account) => account.provider === provider && account.socialId === profile.id
    );

    if (existingLink) {
      throw new Error(`${provider} account is already linked`);
    }

    // Check if another user has this social account
    const existingUser = await User.findOne({
      $or: [
        { socialId: profile.id, authProvider: provider },
        { 'socialAccounts.socialId': profile.id, 'socialAccounts.provider': provider },
      ],
    });

    if (existingUser && existingUser._id !== userId) {
      throw new Error('This social account is already linked to another user');
    }

    // Add to socialAccounts array
    user.socialAccounts.push({
      provider,
      socialId: profile.id,
      email: profile.email || user.email,
    });

    await user.save();

    return {
      message: `${provider} account linked successfully`,
      socialAccounts: user.socialAccounts,
    };
  } catch (error) {
    logger.error('linkSocialAccount error', {
      error: error.message,
      userId,
      provider,
    });
    throw error;
  }
};

/**
 * Unlink a social account from user
 */
const unlinkSocialAccount = async (userId, provider) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow unlinking if it's the primary auth method and no password is set
    if (user.authProvider === provider && !user.password) {
      throw new Error('Cannot unlink primary authentication method. Please set a password first.');
    }

    // Remove from socialAccounts array
    user.socialAccounts = user.socialAccounts.filter(
      (account) => account.provider !== provider
    );

    // If unlinking primary auth provider, switch to local if password exists
    if (user.authProvider === provider && user.password) {
      user.authProvider = 'local';
      user.socialId = null;
    }

    await user.save();

    return {
      message: `${provider} account unlinked successfully`,
      socialAccounts: user.socialAccounts,
    };
  } catch (error) {
    logger.error('unlinkSocialAccount error', {
      error: error.message,
      userId,
      provider,
    });
    throw error;
  }
};

module.exports = {
  authenticateGoogle,
  authenticateApple,
  authenticateInstagram,
  findOrCreateSocialUser,
  getGoogleProfile,
  getAppleProfile,
  getInstagramProfile,
  linkSocialAccount,
  unlinkSocialAccount,
};

