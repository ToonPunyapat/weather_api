const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views'); // ระบุตำแหน่งโฟลเดอร์ views

app.get('/', (req, res) => {
    res.render('index');  // เรนเดอร์ไฟล์ index.ejs
});

const extractProvinces = (text) => {
    const regex = /บริเวณจังหวัด(.*?)อุณหภูมิต่ำสุด/g;
    const match = regex.exec(text);
    if (match) {
        // กรองคำว่า "และ" ตั้งแต่ตอนดึงข้อมูล

        // split ('abc')[0] : remove string หลังจาก 'abc'  
        msg = match[1].trim().replace(/\s+/g, ' ').replace(/และ\s*/g , '').split('หลังจาก')[0];
        console.log(msg)
        return msg
    }
    return null;
};

app.get('/fetch-weather-regions', async (req, res) => {
    try {
        const url = 'https://tmd.go.th/forecast/daily';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const weatherData = [];
        const time = new Date().toLocaleString();  // เพิ่มตัวแปรเก็บเวลา

        // ดึงข้อมูลจากแท็กที่มี class 'text-start'
        $('.text-start').each((i, element) => {
            const regions = $(element).find('.sub-title');
            const contents = $(element).find('.sub-content');

            regions.each((index, regionElement) => {
                const region = $(regionElement).text().trim();
                const content = $(contents[index]).text().trim();
                const provinces = extractProvinces(content);

                if (provinces) {
                    // แยกจังหวัดเป็นอาร์เรย์
                    const provincesArray = provinces.split(' ');
                    weatherData.push({
                        region,
                        content,
                        provinces: provincesArray
                    });
                }
            });
        });

        // ส่งข้อมูลออกเป็น JSON พร้อมเวลา
        res.json({ time, weatherData });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching weather data');
    }
});

app.get('/fetch-weather-provinces-only', async (req, res) => {
    try {
        const url = 'https://tmd.go.th/forecast/daily';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let allProvinces = [];
        const time = new Date().toLocaleString();  // เพิ่มตัวแปรเก็บเวลา

        // ดึงข้อมูลจากแท็กที่มี class 'text-start'
        $('.text-start').each((i, element) => {
            const contents = $(element).find('.sub-content');

            contents.each((index, contentElement) => {
                const content = $(contentElement).text().trim();
                const provinces = extractProvinces(content);

                if (provinces) {
                    // แยกชื่อจังหวัดและรวมในอาร์เรย์
                    const provincesArray = provinces.split(' ');
                    allProvinces = allProvinces.concat(provincesArray); // รวมทั้งหมดในอาร์เรย์เดียว
                }
            });
        });

        // รวมเป็นสตริงเดียว
        const provincesLine = allProvinces.join(', ');
        
        // ส่งข้อมูลออกเป็น JSON พร้อมเวลา
        res.json({ time, provinces: provincesLine });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching weather data');
    }
});

app.get('/fetch-weather-province-amphoe', async (req, res) => {
    const { province, amphoe } = req.query;
    if (!province || !amphoe ) {
        return res.status(400).send('ต้องระบุ province และ amphoe ');
    }
    
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 10);

    try {
        const response = await axios.get('https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/place', {
            params: {
                province,
                amphoe,
                fields: 'tc_max,tc_min,rh,cond,slp,psfc,rain,ws10m,wd10m,cloudlow,cloudmed,cloudhigh,swdown',
                date: formattedDate,
                duration: 10
            },
            headers: {
                accept: 'application/json',
                authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjczOTNmYWM3MjQ1YWFlODBkYjIzMTU4NzcyZjNiMzY1MWRkYjVjNWE3N2UyZjY2MDk0ZmNkZjk5N2I4ZjA1NTUzZWJiZmJlMzQ5YzY5NWZjIn0.eyJhdWQiOiIyIiwianRpIjoiNzM5M2ZhYzcyNDVhYWU4MGRiMjMxNTg3NzJmM2IzNjUxZGRiNWM1YTc3ZTJmNjYwOTRmY2RmOTk3YjhmMDU1NTNlYmJmYmUzNDljNjk1ZmMiLCJpYXQiOjE3MTk4NDEzNDMsIm5iZiI6MTcxOTg0MTM0MywiZXhwIjoxNzUxMzc3MzQzLCJzdWIiOiIzMjQwIiwic2NvcGVzIjpbXX0.ZXrnBO1iBYxPDCWLamBnD32pz47COyvigq8IFUYsiSfA6m9zhn2sb7DGbP6GgTTIYPKAsNM-bMoC75yisy8uk4ktw7sWpciiBDzpgrHTMfbQgGRQfsHRwsmibQeUDbcGbbULhXXV0lptpPJY5-L5H7-oxEBx34iEz9scaPQ7FzUtmL0w6eq2oz5pzUkuBObIZKFvjoADV_wfcV3krtCvWfLFYx4Nbm6-RlnpHu3JU1GlQiQPNguaBpWtYPPvmi5NSJO4j8hwVOAqHbLXWE1E3gfSBORdAIE_LtddSDtSoGO6hSqPW6rocbKDrJUZR_2b-8pI6bX8bGolyYoaev5I168pEMNiTos-waOgb7l2-hHD6aIJ8JX3P8KmYx69TG_tM2ISqeYlI3nOOGnGj0na7v8yjG74Fj62_hQJaC7_YQxqJ1ps2nq-93Zreox0SFp-9od8-_r_FEQDB-oflKHHK72rJUo2w9ciVcExnQOCzb5gipAURdaDf6pqha0HiAo4oH4vQdCFj43X2zBkLbXOrdu7fR0PrnCblC7z9tl47SLsQ0UZogA08z86VRzfEs9psis_wXMLvjTDC6UKTCKntMXQi48juK0XQgKxx-Vy8dV15pTNozfJ2UIphodrL2FrHbmac73cBFvU6rAjFV_ugqU92WiZtULdAcp_EnW50tk'
            }
        });

        const weatherData = response.data.WeatherForecasts[0].forecasts;
        console.log('Weather Data:', weatherData);

        if (!weatherData) {
            console.error('Received data:', response.data);
            return res.status(500).send('Error: Invalid weather data received');
        }

        // ส่งข้อมูลเป็น JSON กลับไปแสดงผลใน HTML
        res.json({province,amphoe,weatherData});
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching weather data');
    }
});

app.get('/fetch-weather-province', async (req, res) => {
    const { province } = req.query;
    if (!province ) {
        return res.status(400).send('ต้องระบุ province');
    }
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 10);

    try {
        const response = await axios.get('https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/place', {
            params: {
                province,
                fields: 'tc_max,tc_min,rh,cond,slp,psfc,rain,ws10m,wd10m,cloudlow,cloudmed,cloudhigh,swdown',
                date: formattedDate,
                duration: 10
            },
            headers: {
                accept: 'application/json',
                authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjczOTNmYWM3MjQ1YWFlODBkYjIzMTU4NzcyZjNiMzY1MWRkYjVjNWE3N2UyZjY2MDk0ZmNkZjk5N2I4ZjA1NTUzZWJiZmJlMzQ5YzY5NWZjIn0.eyJhdWQiOiIyIiwianRpIjoiNzM5M2ZhYzcyNDVhYWU4MGRiMjMxNTg3NzJmM2IzNjUxZGRiNWM1YTc3ZTJmNjYwOTRmY2RmOTk3YjhmMDU1NTNlYmJmYmUzNDljNjk1ZmMiLCJpYXQiOjE3MTk4NDEzNDMsIm5iZiI6MTcxOTg0MTM0MywiZXhwIjoxNzUxMzc3MzQzLCJzdWIiOiIzMjQwIiwic2NvcGVzIjpbXX0.ZXrnBO1iBYxPDCWLamBnD32pz47COyvigq8IFUYsiSfA6m9zhn2sb7DGbP6GgTTIYPKAsNM-bMoC75yisy8uk4ktw7sWpciiBDzpgrHTMfbQgGRQfsHRwsmibQeUDbcGbbULhXXV0lptpPJY5-L5H7-oxEBx34iEz9scaPQ7FzUtmL0w6eq2oz5pzUkuBObIZKFvjoADV_wfcV3krtCvWfLFYx4Nbm6-RlnpHu3JU1GlQiQPNguaBpWtYPPvmi5NSJO4j8hwVOAqHbLXWE1E3gfSBORdAIE_LtddSDtSoGO6hSqPW6rocbKDrJUZR_2b-8pI6bX8bGolyYoaev5I168pEMNiTos-waOgb7l2-hHD6aIJ8JX3P8KmYx69TG_tM2ISqeYlI3nOOGnGj0na7v8yjG74Fj62_hQJaC7_YQxqJ1ps2nq-93Zreox0SFp-9od8-_r_FEQDB-oflKHHK72rJUo2w9ciVcExnQOCzb5gipAURdaDf6pqha0HiAo4oH4vQdCFj43X2zBkLbXOrdu7fR0PrnCblC7z9tl47SLsQ0UZogA08z86VRzfEs9psis_wXMLvjTDC6UKTCKntMXQi48juK0XQgKxx-Vy8dV15pTNozfJ2UIphodrL2FrHbmac73cBFvU6rAjFV_ugqU92WiZtULdAcp_EnW50tk'
            }
        });

        const weatherData = response.data.WeatherForecasts[0].forecasts;
        console.log('Weather Data:', weatherData);

        if (!weatherData) {
            console.error('Received data:', response.data);
            return res.status(500).send('Error: Invalid weather data received');
        }

        // ส่งข้อมูลเป็น JSON กลับไปแสดงผลใน HTML
        res.json({province,weatherData});
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching weather data');
    }
});

// ==================================================================
// only cond

app.get('/fetch-weather-province-amphoe-tambon-cond', async (req, res) => {
    const { province, amphoe ,tambon} = req.query;
    if (!province || !amphoe || !tambon) {
        return res.status(400).send('ต้องระบุ province ,amphoe และ tambon');
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 10);

    try {
        const response = await axios.get('https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/place', {
            params: {
                province,                                                                                                                                                                                         
                amphoe,
                tambon,
                fields: 'tc_max,tc_min,rh,cond,slp,psfc,rain,ws10m,wd10m,cloudlow,cloudmed,cloudhigh,swdown',
                date: formattedDate,
                duration: 100
            },
            headers: {
                accept: 'application/json',
                authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjczOTNmYWM3MjQ1YWFlODBkYjIzMTU4NzcyZjNiMzY1MWRkYjVjNWE3N2UyZjY2MDk0ZmNkZjk5N2I4ZjA1NTUzZWJiZmJlMzQ5YzY5NWZjIn0.eyJhdWQiOiIyIiwianRpIjoiNzM5M2ZhYzcyNDVhYWU4MGRiMjMxNTg3NzJmM2IzNjUxZGRiNWM1YTc3ZTJmNjYwOTRmY2RmOTk3YjhmMDU1NTNlYmJmYmUzNDljNjk1ZmMiLCJpYXQiOjE3MTk4NDEzNDMsIm5iZiI6MTcxOTg0MTM0MywiZXhwIjoxNzUxMzc3MzQzLCJzdWIiOiIzMjQwIiwic2NvcGVzIjpbXX0.ZXrnBO1iBYxPDCWLamBnD32pz47COyvigq8IFUYsiSfA6m9zhn2sb7DGbP6GgTTIYPKAsNM-bMoC75yisy8uk4ktw7sWpciiBDzpgrHTMfbQgGRQfsHRwsmibQeUDbcGbbULhXXV0lptpPJY5-L5H7-oxEBx34iEz9scaPQ7FzUtmL0w6eq2oz5pzUkuBObIZKFvjoADV_wfcV3krtCvWfLFYx4Nbm6-RlnpHu3JU1GlQiQPNguaBpWtYPPvmi5NSJO4j8hwVOAqHbLXWE1E3gfSBORdAIE_LtddSDtSoGO6hSqPW6rocbKDrJUZR_2b-8pI6bX8bGolyYoaev5I168pEMNiTos-waOgb7l2-hHD6aIJ8JX3P8KmYx69TG_tM2ISqeYlI3nOOGnGj0na7v8yjG74Fj62_hQJaC7_YQxqJ1ps2nq-93Zreox0SFp-9od8-_r_FEQDB-oflKHHK72rJUo2w9ciVcExnQOCzb5gipAURdaDf6pqha0HiAo4oH4vQdCFj43X2zBkLbXOrdu7fR0PrnCblC7z9tl47SLsQ0UZogA08z86VRzfEs9psis_wXMLvjTDC6UKTCKntMXQi48juK0XQgKxx-Vy8dV15pTNozfJ2UIphodrL2FrHbmac73cBFvU6rAjFV_ugqU92WiZtULdAcp_EnW50tk'
            }
        });

        const weatherData = response.data.WeatherForecasts[0].forecasts;
        console.log('Weather Data:', weatherData);

        if (!weatherData) {
            console.error('Received data:', response.data);
            return res.status(500).send('Error: Invalid weather data received');
        }

        // ส่งข้อมูลเป็น JSON กลับไปแสดงผลใน HTML
        res.json({province,amphoe,tambon,weatherData});
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching weather data');
    }
});

// ==================================================================

app.get('/fetch-weather-lat-lon', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).send('ต้องระบุ lat และ lon');
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 10);

    // ฟังก์ชันสำหรับปรับพิกัดให้ใกล้เคียง
    const adjustCoords = (lat, lon) => {
        const offset = 0.1;
        return [
            { lat: parseFloat(lat) + offset, lon: parseFloat(lon) },
            { lat: parseFloat(lat) - offset, lon: parseFloat(lon) },
            { lat: parseFloat(lat), lon: parseFloat(lon) + offset },
            { lat: parseFloat(lat), lon: parseFloat(lon) - offset },
            { lat: parseFloat(lat) + offset, lon: parseFloat(lon) + offset },
            { lat: parseFloat(lat) - offset, lon: parseFloat(lon) - offset },
            { lat: parseFloat(lat) + offset, lon: parseFloat(lon) - offset },
            { lat: parseFloat(lat) - offset, lon: parseFloat(lon) + offset }
        ];
    };

    // เริ่มต้นพยายามเรียกใช้พิกัดที่ส่งมา และพิกัดที่ใกล้เคียง
    const attempts = [{ lat, lon }, ...adjustCoords(lat, lon)];

    for (const attempt of attempts) {
        try {
            const response = await axios.get('https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at', {
                params: {
                    lat: attempt.lat,
                    lon: attempt.lon,
                    fields: 'tc_max,tc_min,rh,cond,slp,psfc,rain,ws10m,wd10m,cloudlow,cloudmed,cloudhigh,swdown',
                    date: formattedDate,
                    duration: 10
                },
                headers: {
                    accept: 'application/json',
                    authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjczOTNmYWM3MjQ1YWFlODBkYjIzMTU4NzcyZjNiMzY1MWRkYjVjNWE3N2UyZjY2MDk0ZmNkZjk5N2I4ZjA1NTUzZWJiZmJlMzQ5YzY5NWZjIn0.eyJhdWQiOiIyIiwianRpIjoiNzM5M2ZhYzcyNDVhYWU4MGRiMjMxNTg3NzJmM2IzNjUxZGRiNWM1YTc3ZTJmNjYwOTRmY2RmOTk3YjhmMDU1NTNlYmJmYmUzNDljNjk1ZmMiLCJpYXQiOjE3MTk4NDEzNDMsIm5iZiI6MTcxOTg0MTM0MywiZXhwIjoxNzUxMzc3MzQzLCJzdWIiOiIzMjQwIiwic2NvcGVzIjpbXX0.ZXrnBO1iBYxPDCWLamBnD32pz47COyvigq8IFUYsiSfA6m9zhn2sb7DGbP6GgTTIYPKAsNM-bMoC75yisy8uk4ktw7sWpciiBDzpgrHTMfbQgGRQfsHRwsmibQeUDbcGbbULhXXV0lptpPJY5-L5H7-oxEBx34iEz9scaPQ7FzUtmL0w6eq2oz5pzUkuBObIZKFvjoADV_wfcV3krtCvWfLFYx4Nbm6-RlnpHu3JU1GlQiQPNguaBpWtYPPvmi5NSJO4j8hwVOAqHbLXWE1E3gfSBORdAIE_LtddSDtSoGO6hSqPW6rocbKDrJUZR_2b-8pI6bX8bGolyYoaev5I168pEMNiTos-waOgb7l2-hHD6aIJ8JX3P8KmYx69TG_tM2ISqeYlI3nOOGnGj0na7v8yjG74Fj62_hQJaC7_YQxqJ1ps2nq-93Zreox0SFp-9od8-_r_FEQDB-oflKHHK72rJUo2w9ciVcExnQOCzb5gipAURdaDf6pqha0HiAo4oH4vQdCFj43X2zBkLbXOrdu7fR0PrnCblC7z9tl47SLsQ0UZogA08z86VRzfEs9psis_wXMLvjTDC6UKTCKntMXQi48juK0XQgKxx-Vy8dV15pTNozfJ2UIphodrL2FrHbmac73cBFvU6rAjFV_ugqU92WiZtULdAcp_EnW50tk' // ใส่ Token ของคุณที่นี่
                }
            });

            const weatherData = response.data.WeatherForecasts[0]?.forecasts;
            if (weatherData) {
                console.log(`Weather data found for (${attempt.lat}, ${attempt.lon})`);
                return res.json({ lat: attempt.lat, lon: attempt.lon, weatherData });
            }

            console.error('No weather data available for:', attempt);
        } catch (error) {
            console.error(`Error fetching weather data for (${attempt.lat}, ${attempt.lon}):`, error.message);
        }
    }

    res.status(500).send('Error: No nearby weather data available');
});

app.get('/fetch-hourly-weather', async (req, res) => {
    const { province, amphoe, tambon, date, hour, duration } = req.query;

    if (!province || !date || !hour || !duration) {
        return res.status(400).send('ต้องระบุ province, date, hour, และ duration');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.status(400).send('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
    }

    const hourInt = parseInt(hour, 10);
    if (isNaN(hourInt) || hourInt < 0 || hourInt > 23) {
        return res.status(400).send('ค่าชั่วโมงต้องอยู่ระหว่าง 0 ถึง 23');
    }

    const durationInt = parseInt(duration, 10);
    if (isNaN(durationInt) || durationInt < 1 || durationInt > 48) {
        return res.status(400).send('ช่วงเวลาต้องอยู่ระหว่าง 1 ถึง 48 ชั่วโมง');
    }

    try {
        const url = `https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/place`;

        // สร้างพารามิเตอร์ตามที่ระบุเท่านั้น
        const params = {
            province,
            fields: 'tc,rh,slp,rain,ws10m,wd10m,cloudlow,cloudmed,cloudhigh',
            date,
            hour,
            duration
        };

        if (amphoe) params.amphoe = amphoe;
        if (tambon) params.tambon = tambon;

        const response = await axios.get(url, {
            params,
            headers: {
                accept: 'application/json',
                authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjczOTNmYWM3MjQ1YWFlODBkYjIzMTU4NzcyZjNiMzY1MWRkYjVjNWE3N2UyZjY2MDk0ZmNkZjk5N2I4ZjA1NTUzZWJiZmJlMzQ5YzY5NWZjIn0.eyJhdWQiOiIyIiwianRpIjoiNzM5M2ZhYzcyNDVhYWU4MGRiMjMxNTg3NzJmM2IzNjUxZGRiNWM1YTc3ZTJmNjYwOTRmY2RmOTk3YjhmMDU1NTNlYmJmYmUzNDljNjk1ZmMiLCJpYXQiOjE3MTk4NDEzNDMsIm5iZiI6MTcxOTg0MTM0MywiZXhwIjoxNzUxMzc3MzQzLCJzdWIiOiIzMjQwIiwic2NvcGVzIjpbXX0.ZXrnBO1iBYxPDCWLamBnD32pz47COyvigq8IFUYsiSfA6m9zhn2sb7DGbP6GgTTIYPKAsNM-bMoC75yisy8uk4ktw7sWpciiBDzpgrHTMfbQgGRQfsHRwsmibQeUDbcGbbULhXXV0lptpPJY5-L5H7-oxEBx34iEz9scaPQ7FzUtmL0w6eq2oz5pzUkuBObIZKFvjoADV_wfcV3krtCvWfLFYx4Nbm6-RlnpHu3JU1GlQiQPNguaBpWtYPPvmi5NSJO4j8hwVOAqHbLXWE1E3gfSBORdAIE_LtddSDtSoGO6hSqPW6rocbKDrJUZR_2b-8pI6bX8bGolyYoaev5I168pEMNiTos-waOgb7l2-hHD6aIJ8JX3P8KmYx69TG_tM2ISqeYlI3nOOGnGj0na7v8yjG74Fj62_hQJaC7_YQxqJ1ps2nq-93Zreox0SFp-9od8-_r_FEQDB-oflKHHK72rJUo2w9ciVcExnQOCzb5gipAURdaDf6pqha0HiAo4oH4vQdCFj43X2zBkLbXOrdu7fR0PrnCblC7z9tl47SLsQ0UZogA08z86VRzfEs9psis_wXMLvjTDC6UKTCKntMXQi48juK0XQgKxx-Vy8dV15pTNozfJ2UIphodrL2FrHbmac73cBFvU6rAjFV_ugqU92WiZtULdAcp_EnW50tk' // ใส่ Token ที่ถูกต้อง
            }
        });

        const weatherData = response.data;

        // ตรวจสอบว่ามีข้อมูลพยากรณ์หรือไม่
        if (!weatherData) {
            return res.status(500).send('ไม่มีข้อมูลพยากรณ์อากาศสำหรับการร้องขอนี้');
        }

        res.json(weatherData);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching hourly weather data');
    }
});



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
