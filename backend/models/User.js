import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
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
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    roles: {
      type: [String],
      default: ['employee']
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { employee: { $type: 'objectId' } }
      }
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    isTemporaryPassword: {
      type: Boolean,
      default: false
    },
    lastPasswordChangeAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Helper to lazily load Employee model safely across all import contexts
const getEmployeeModel = async () => mongoose.models.Employee || (await import('./Employee.js')).default;

// Pre-save hook: auto-link with Employee if matching email exists and employee is not explicitly specified
userSchema.pre('save', async function () {
  try {
    if (!this.employee && this.email) {
      const Employee = await getEmployeeModel();
      const matchedEmployee = await Employee.findOne({ email: this.email.toLowerCase() });
      if (matchedEmployee) {
        this.employee = matchedEmployee._id;
      }
    }
  } catch (err) {
    console.warn('User pre-save employee link error:', err.message);
  }
});

// Post-save hook: ensure linked Employee points back to this User
userSchema.post('save', async function (doc) {
  try {
    if (doc && doc.employee) {
      const Employee = await getEmployeeModel();
      await Employee.updateOne(
        { _id: doc.employee },
        {
          $set: {
            user: doc._id
          }
        }
      );
    }
  } catch (err) {
    console.warn('User post-save employee sync error:', err.message);
  }
});

// Post-findOneAndUpdate hook: synchronize Employee link
userSchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && doc.employee) {
      const Employee = await getEmployeeModel();
      await Employee.updateOne(
        { _id: doc.employee },
        {
          $set: {
            user: doc._id
          }
        }
      );
    }
  } catch (err) {
    console.warn('User post-findOneAndUpdate employee sync error:', err.message);
  }
});

// Post-findOneAndDelete hook: unlink Employee when User is deleted
userSchema.post('findOneAndDelete', async function (doc) {
  try {
    if (doc) {
      const Employee = await getEmployeeModel();
      await Employee.updateMany(
        { user: doc._id },
        { $set: { user: null } }
      );
    }
  } catch (err) {
    console.warn('User post-findOneAndDelete employee sync error:', err.message);
  }
});

userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;
