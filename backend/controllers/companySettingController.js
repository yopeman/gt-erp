import CompanySetting from '../models/CompanySetting.js';
import Holiday from '../models/Holiday.js';

// Get company HR settings (or default if not yet created)
export const getCompanySetting = async (req, res) => {
  try {
    let setting = await CompanySetting.findOne().sort({ createdAt: -1 });

    if (!setting) {
      // Seed default company setting
      setting = await CompanySetting.create({
        companyName: 'GT ERP Corporation',
        currency: 'ETB',
        officeLocations: [
          {
            name: 'Main HQ Office',
            address: 'Bole, Addis Ababa, Ethiopia',
            latitude: 9.0107,
            longitude: 38.7612,
            radiusMeters: 250,
            isActive: true,
            isDefault: true
          }
        ],
        workSchedule: {
          standardStartTime: '09:00',
          standardEndTime: '17:00',
          gracePeriodMinutes: 15,
          standardDailyHours: 8,
          workingDays: [1, 2, 3, 4, 5]
        },
        leaveSettings: {
          annualDaysPerYear: 16,
          sickDaysPerYear: 15,
          emergencyDaysPerYear: 5,
          casualDaysPerYear: 3,
          maternityDays: 90,
          paternityDays: 5,
          requireAttachmentForSickLeave: true
        },
        payrollSettings: {
          employeePensionPercent: 7,
          employerPensionPercent: 11,
          overtimeRateRegular: 1.5,
          overtimeRateHoliday: 2.0,
          overtimeRateWeekend: 1.5
        }
      });
    }

    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company settings',
      error: error.message
    });
  }
};

// Update company HR settings
export const updateCompanySetting = async (req, res) => {
  try {
    let setting = await CompanySetting.findOne().sort({ createdAt: -1 });

    if (!setting) {
      setting = await CompanySetting.create(req.body);
    } else {
      setting = await CompanySetting.findByIdAndUpdate(
        setting._id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Company settings updated successfully',
      data: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update company settings',
      error: error.message
    });
  }
};

// Add office branch location
export const addOfficeLocation = async (req, res) => {
  try {
    const { name, address, latitude, longitude, radiusMeters, isDefault } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'name, latitude, and longitude are required'
      });
    }

    let setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    if (!setting) {
      setting = await CompanySetting.create({});
    }

    setting.officeLocations.push({
      name,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters) || 200,
      isActive: true,
      isDefault: Boolean(isDefault)
    });

    await setting.save();

    res.status(201).json({
      success: true,
      message: 'Office location added successfully',
      data: setting.officeLocations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add office location',
      error: error.message
    });
  }
};

// Holiday Management
export const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const query = { isActive: true };

    if (year) {
      const startOfYear = new Date(Number(year), 0, 1);
      const endOfYear = new Date(Number(year), 11, 31, 23, 59, 59);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });

    res.status(200).json({
      success: true,
      data: holidays
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holidays',
      error: error.message
    });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const { title, date, isRecurringYearly, description } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'title and date are required'
      });
    }

    const holiday = await Holiday.create({
      title,
      date: new Date(date),
      isRecurringYearly: Boolean(isRecurringYearly),
      description
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create holiday',
      error: error.message
    });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete holiday',
      error: error.message
    });
  }
};

