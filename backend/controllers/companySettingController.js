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

    // Enforce exactly one Default HQ location
    if (setting && setting.officeLocations && setting.officeLocations.length > 0) {
      let defaultFound = false;
      let modified = false;
      for (const loc of setting.officeLocations) {
        if (loc.isDefault) {
          if (!defaultFound) {
            defaultFound = true;
          } else {
            loc.isDefault = false;
            modified = true;
          }
        }
      }
      if (!defaultFound && setting.officeLocations.length > 0) {
        setting.officeLocations[0].isDefault = true;
        modified = true;
      }
      if (modified) {
        await setting.save();
      }
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

    const updateData = { ...req.body };

    // Enforce single default if officeLocations provided in bulk update
    if (Array.isArray(updateData.officeLocations) && updateData.officeLocations.length > 0) {
      let defaultSeen = false;
      updateData.officeLocations = updateData.officeLocations.map((loc) => {
        if (loc.isDefault) {
          if (!defaultSeen) {
            defaultSeen = true;
            return { ...loc, isDefault: true };
          }
          return { ...loc, isDefault: false };
        }
        return loc;
      });
      if (!defaultSeen && updateData.officeLocations.length > 0) {
        updateData.officeLocations[0].isDefault = true;
      }
    }

    if (!setting) {
      setting = await CompanySetting.create(updateData);
    } else {
      setting = await CompanySetting.findByIdAndUpdate(
        setting._id,
        { $set: updateData },
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

    const makeDefault = Boolean(isDefault) || setting.officeLocations.length === 0;

    if (makeDefault) {
      setting.officeLocations.forEach((loc) => {
        loc.isDefault = false;
      });
    }

    setting.officeLocations.push({
      name,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters) || 200,
      isActive: true,
      isDefault: makeDefault
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

// Update office branch location
export const updateOfficeLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, radiusMeters, isActive, isDefault } = req.body;

    let setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    const loc = setting.officeLocations.id(id) || setting.officeLocations.find((l) => String(l._id) === String(id));
    if (!loc) {
      return res.status(404).json({
        success: false,
        message: 'Office location not found'
      });
    }

    if (name !== undefined) loc.name = name;
    if (address !== undefined) loc.address = address;
    if (latitude !== undefined) loc.latitude = Number(latitude);
    if (longitude !== undefined) loc.longitude = Number(longitude);
    if (radiusMeters !== undefined) loc.radiusMeters = Number(radiusMeters);
    if (isActive !== undefined) loc.isActive = Boolean(isActive);

    if (isDefault) {
      setting.officeLocations.forEach((l) => {
        if (String(l._id) !== String(id)) {
          l.isDefault = false;
        }
      });
      loc.isDefault = true;
    } else if (isDefault === false && loc.isDefault) {
      loc.isDefault = false;
      const other = setting.officeLocations.find((l) => String(l._id) !== String(id) && l.isActive);
      if (other) {
        other.isDefault = true;
      } else {
        loc.isDefault = true; // Always retain at least one default
      }
    }

    await setting.save();

    res.status(200).json({
      success: true,
      message: 'Office location updated successfully',
      data: setting.officeLocations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update office location',
      error: error.message
    });
  }
};

// Delete office branch location
export const deleteOfficeLocation = async (req, res) => {
  try {
    const { id } = req.params;

    let setting = await CompanySetting.findOne().sort({ createdAt: -1 });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    const loc = setting.officeLocations.id(id) || setting.officeLocations.find((l) => String(l._id) === String(id));
    if (!loc) {
      return res.status(404).json({
        success: false,
        message: 'Office location not found'
      });
    }

    const wasDefault = loc.isDefault;
    setting.officeLocations = setting.officeLocations.filter((l) => String(l._id) !== String(id));

    if (wasDefault && setting.officeLocations.length > 0) {
      setting.officeLocations[0].isDefault = true;
    }

    await setting.save();

    res.status(200).json({
      success: true,
      message: 'Office location deleted successfully',
      data: setting.officeLocations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete office location',
      error: error.message
    });
  }
};

// Holiday Management
export const getHolidays = async (req, res) => {
  try {
    const { year, includeInactive, all } = req.query;
    const query = {};

    if (includeInactive !== 'true' && all !== 'true') {
      query.isActive = true;
    }

    if (year && year !== 'all') {
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
    const { title, date, isRecurringYearly, description, isActive } = req.body;

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
      description,
      isActive: isActive !== undefined ? Boolean(isActive) : true
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

export const updateHoliday = async (req, res) => {
  try {
    const { title, date, isRecurringYearly, description, isActive } = req.body;

    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    if (title !== undefined) holiday.title = title;
    if (date !== undefined) holiday.date = new Date(date);
    if (isRecurringYearly !== undefined) holiday.isRecurringYearly = Boolean(isRecurringYearly);
    if (description !== undefined) holiday.description = description;
    if (isActive !== undefined) holiday.isActive = Boolean(isActive);

    await holiday.save();

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update holiday',
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

