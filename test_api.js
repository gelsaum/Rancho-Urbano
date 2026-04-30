require('dotenv').config();
const axios = require('axios');

async function test() {
    try {
        console.log("Fetching profile...");
        const resProfile = await axios.post(process.env.EVOLUTION_API_URL + '/chat/fetchProfile/' + process.env.INSTANCE_NAME, { number: '595971450246' }, { headers: { apikey: process.env.EVOLUTION_API_KEY } });
        console.log("Profile:", resProfile.data);

        console.log("Fetching contacts...");
        const resContacts = await axios.post(process.env.EVOLUTION_API_URL + '/chat/findContacts/' + process.env.INSTANCE_NAME, { where: { id: '595971450246@s.whatsapp.net' } }, { headers: { apikey: process.env.EVOLUTION_API_KEY } });
        console.log("Contacts:", resContacts.data);
    } catch (e) {
        console.log("Error:", e.response ? e.response.data : e.message);
    }
}
test();
