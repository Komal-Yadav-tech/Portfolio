/**
 * Optional MongoDB Configuration & Mongoose Models
 * For users wishing to switch from SQLite to MongoDB Atlas / Local MongoDB.
 */

// Example usage:
// const mongoose = require('mongoose');
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/komal_portfolio';

const ProfileSchema = {
  fullName: { type: String, required: true },
  title: { type: String, required: true },
  greeting: { type: String, default: "Hello, I'm" },
  bio: { type: String, required: true },
  availabilityStatus: { type: String, default: "AVAILABLE FOR WORK" },
  profileImage: String,
  resumeUrl: String,
  email: String,
  phone: String,
  location: String,
  website: String,
  linkedin: String,
  github: String,
  twitter: String,
  stats: {
    experience: { type: String, default: "4+ Yrs" },
    projects: { type: String, default: "45+" },
    clients: { type: String, default: "30+" }
  },
  quote: {
    text: String,
    author: String,
    role: String
  },
  footer: {
    title: String,
    content: String,
    media: String
  }
};

const ServiceSchema = {
  title: { type: String, required: true },
  description: { type: String, required: true },
  priceBadge: String,
  icon: { type: String, default: "fa-code" },
  sortOrder: { type: Number, default: 0 }
};

const ProjectSchema = {
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  mediaUrl: String,
  mediaType: { type: String, default: "image" },
  liveUrl: String,
  githubUrl: String,
  featured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
};

const ReviewSchema = {
  clientName: { type: String, required: true },
  roleCompany: { type: String, required: true },
  rating: { type: Number, default: 5 },
  reviewText: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
};

module.exports = {
  ProfileSchema,
  ServiceSchema,
  ProjectSchema,
  ReviewSchema,
  connectMongoDB: async (uri) => {
    console.log(`[MongoDB] Config ready for URI: ${uri || 'MONGODB_URI'}`);
  }
};
