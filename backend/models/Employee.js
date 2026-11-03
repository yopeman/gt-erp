import mongoose from 'mongoose';
const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    issuedAt: {
      type: Date
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    expiresAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const educationSchema = new mongoose.Schema(
  {
    graduationYear: {
      type: Number
    },
    graduationUniversity: {
      type: String,
      trim: true
    },
    educationLevel: {
      type: String,
      enum: ['degree', 'master', 'diploma', 'doctorate', 'high school', 'other'],
      trim: true
    }
  },
  { _id: false }
);

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      trim: true,
      default: 'Commercial Bank of Ethiopia (CBE)'
    },
    holderName: {
      type: String,
      trim: true
    },
    number: {
      type: String,
      trim: true
    },
    branch: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      trim: true
    },
    branch: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    detailAddress: {
      location: {
        type: String,
        trim: true
      },
      home: {
        type: String,
        trim: true
      }
    },
    hiredAt: {
      type: Date,
      default: Date.now
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { user: { $type: 'objectId' } }
      }
    },
    type: {
      type: String,
      enum: ['remote', 'part time', 'full time', 'contract', 'intern'],
      required: [true, 'Employment type is required']
    },
    profileImage: {
      type: String,
      default: null,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'terminated'],
      default: 'active'
    },
    documents: [documentSchema],
    nationalId: {
      type: String,
      trim: true
    },
    emergency: {
      contactName: {
        type: String,
        trim: true
      },
      contactPhone: {
        type: String,
        trim: true
      },
      contactRelationship: {
        type: String,
        trim: true
      },
      warrantyRelationshipToEmployee: {
        type: String,
        trim: true
      }
    },
    warranty: {
      fullName: {
        type: String,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      nationalId: {
        type: String,
        trim: true
      },
      relationshipToEmployee: {
        type: String,
        trim: true
      }
    },
    educations: [educationSchema],
    accountDetails: [bankAccountSchema],
    baseSalary: {
      type: Number,
      default: 0,
      min: [0, 'Base salary cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: auto-link with User or create default User account if none exists
employeeSchema.pre('save', async function () {
  try {
    if (!this.user && this.email) {
      const User = mongoose.models.User || mongoose.model('User');
      let matchedUser = await User.findOne({ email: this.email.toLowerCase() });
      if (!matchedUser) {
        const { hashPassword } = await import('../utils/password.js');
        const defaultPassword = 'password123';
        matchedUser = await User.create({
          fullName: this.fullName,
          email: this.email.toLowerCase(),
          password: hashPassword(defaultPassword),
          roles: ['employee']
        });
      }
      if (matchedUser) {
        this.user = matchedUser._id;
      }
    }
  } catch (err) {
    console.warn('Employee pre-save user link error:', err.message);
  }
});

// Post-save hook: ensure linked User points back to this Employee and keeps profile synchronized
employeeSchema.post('save', async function (doc) {
  try {
    if (doc && doc.user) {
      const User = mongoose.models.User || mongoose.model('User');
      await User.updateOne(
        { _id: doc.user },
        {
          $set: {
            employee: doc._id,
            fullName: doc.fullName,
            email: doc.email.toLowerCase()
          }
        }
      );
    }
  } catch (err) {
    console.warn('Employee post-save user sync error:', err.message);
  }
});

// Post-findOneAndUpdate hook: keep bidirectional link and user fields synchronized
employeeSchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && doc.user) {
      const User = mongoose.models.User || mongoose.model('User');
      const updateData = {
        employee: doc._id,
        fullName: doc.fullName,
        email: doc.email.toLowerCase()
      };
      if (doc.status === 'terminated') {
        updateData.isDeleted = true;
      }
      await User.updateOne({ _id: doc.user }, { $set: updateData });
    }
  } catch (err) {
    console.warn('Employee post-findOneAndUpdate user sync error:', err.message);
  }
});

// Post-findOneAndDelete hook: unlink User when Employee is deleted
employeeSchema.post('findOneAndDelete', async function (doc) {
  try {
    if (doc) {
      const User = mongoose.models.User || mongoose.model('User');
      await User.updateMany(
        { employee: doc._id },
        { $set: { employee: null } }
      );
    }
  } catch (err) {
    console.warn('Employee post-findOneAndDelete user sync error:', err.message);
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;

