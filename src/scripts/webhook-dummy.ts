import { createServer } from 'http';
const server = createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      console.log('Webhook received:', body);
      res.writeHead(200);
      res.end('ok');
    });
  } else {
    res.writeHead(200);
    res.end('alive');
  }
});
server.listen(3030, () => console.log('dummy webhook on :3030'));
