const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const competitionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
    },
    short_description: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: [200, 'Short description must not exceed 200 characters'],
    },
    long_description: {
      type: String,
      required: [true, 'Long description is required'],
    },
    image_url: {
      type: String,
      default: null,
    },
    category_id: {
      type: String,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    draw_time: {
      type: Date,
      required: [true, 'Draw time is required'],
    },
    cash_alternative: {
      type: Number,
      default: 0,
      min: 0,
    },
    ticket_price: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0.01, 'Ticket price must be greater than 0'],
    },
    max_tickets: {
      type: Number,
      required: [true, 'Max tickets is required'],
      min: [1, 'Max tickets must be at least 1'],
    },
    max_per_person: {
      type: Number,
      required: [true, 'Max per person is required'],
      min: [1, 'Max per person must be at least 1'],
    },
    tickets_sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    draw_countdown: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'closed', 'completed'],
      default: 'upcoming',
    },
    live_draw_watching_url: {
      type: String,
      default: null,
    },
    hls_stream_url: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow null
          return v.endsWith('.m3u8') || v.includes('m3u8') || v.includes('hls');
        },
        message: 'HLS stream URL should point to an .m3u8 manifest file'
      }
    },
    stream_room_id: {
      type: String,
      default: null,
    },
    stream_started_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

competitionSchema.pre('save', async function (next) {
  if (this.draw_time && !this.draw_countdown) {
    this.draw_countdown = this.draw_time;
  }

  if (this.title && !this.slug) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    const MAX_RETRY_ATTEMPTS = 100;

    while (counter <= MAX_RETRY_ATTEMPTS) {
      const existingCompetition = await mongoose.model('Competition').findOne({ 
        slug: slug,
        _id: { $ne: this._id } 
      });

      if (!existingCompetition) {
        this.slug = slug;
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    if (counter > MAX_RETRY_ATTEMPTS) {
      return next(new Error('Failed to generate unique slug'));
    }
  }

  next();
});

competitionSchema.virtual('is_sold_out').get(function () {
  return this.tickets_sold >= this.max_tickets;
});

competitionSchema.index({ category_id: 1 });
competitionSchema.index({ status: 1 });
competitionSchema.index({ draw_time: 1 });
competitionSchema.index({ category_id: 1, status: 1 });

const Competition = mongoose.model('Competition', competitionSchema);

module.exports = Competition;

