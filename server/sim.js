const axios = require('axios');

const payload = {
  object: 'page',
  entry: [
    {
      messaging: [
        {
          sender: { id: '987654321' },
          message: {
            mid: 'm_123',
            text: 'مرحباً يا فريق GMIS! هل يمكنني معرفة المزيد عن المناهج الدراسية؟ أردت تجربة نظامكم الجديد 😍'
          }
        }
      ]
    }
  ]
};

axios.post('http://localhost:3001/webhook', payload)
  .then(() => console.log('✅ Simulated Webhook sent successfully!'))
  .catch(err => console.error('❌ Failed:', err.message));
