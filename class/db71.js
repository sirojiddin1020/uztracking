// @ts-check
const { Pool } = require('pg');
const { DB71 } = require('../config');
const Joi = require('joi');
const Data = require('./data');

const schema = Joi.object({
    keyword: Joi.string().optional().default('0'),
    date_time: Joi.date().required(),
    coordinate: Joi.object({
        lat: Joi.number().required().min(-90).max(90).not(0),
        lng: Joi.number().required().min(-180).max(180).not(0)
    }).required(),
    ignition: Joi.boolean().required(),
    speed: Joi.number().required(),
    angle: Joi.number().required(),
    battery_level: Joi.number().optional().default(0),
    message: Joi.string().required(),
    args: Joi.object({
        charging: Joi.boolean().optional().allow(null).default(false), //Joi.bool().optional().default(false),
        altitude: Joi.number().optional().default(0),
        sattelites: Joi.number().optional().default(0)
    }).optional().default({})
});

module.exports = {
    /**
     * 
     * @param {string} imei 
     * @returns {Promise<number>}
     */
    getDeviceUID: async (imei) => {
        const pool = new Pool(DB71);
        try {
            let res = await pool.query(`SELECT uid FROM devices WHERE device_key = $1`, [imei]);
            if (res.rowCount > 0)
                return res.rows[0].uid;
            else
                return -1;
        } catch (error) {
            console.log("DB71 Error:", error.message);
            return -1;
        } finally {
            pool.end();
        }
    },

    /**
     * 
     * @param {number} uid 
     * @param {Data} data 
     * @returns {Promise<number> | void}
     */
    write: (uid, data) => {
        const { value, error } = schema.validate(data);

        if (error) {
            console.log('Error data came ', data);
            return console.error("Validate Error:", error.details[0].message);
        } else {
            console.log('True data came ', value);
            const pool = new Pool(DB71);
            pool.query(`
                    INSERT INTO reports.tracking (device_id, keyword, date_time, speed, angle, battery_level, message, args, lat, lon, ignition) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (device_id) DO UPDATE
                    SET 
                    keyword = $2,
                    date_time = $3,
                    speed = $4,
                    angle = $5,
                    battery_level = $6,
                    message = $7,
                    args = $8,
                    lat = $9,
                    lon = $10,
                    ignition = $11;`,
                [uid,
                    value.keyword,
                    value.date_time,
                    value.speed,
                    value.angle,
                    value.battery_level,
                    value.message,
                    JSON.stringify(value.args),
                    value.coordinate.lat,
                    value.coordinate.lng,
                    value.ignition
                ], (err) => {
                    pool.end();
                    if (err)
                        console.error("DB71 Error:", err);
                });
        }
    }
}