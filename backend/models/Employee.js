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
    accountDetails: {
      holderName: {
        type: String,
        trim: true
      },
      number: {
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
        default: true
      }
    },
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

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;

