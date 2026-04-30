const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json());
app.post('*', (req, res) => {
    if (req.body && req.body.event === 'messages.upsert') {
        fs.writeFileSync('hook_upsert.json', JSON.stringify(req.body, null, 2));
        console.log('Saved hook_upsert.json');
        process.exit(0);
    }
    res.status(200).send();
});
app.listen(3011, () => console.log('Listening on 3011'));
