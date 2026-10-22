# PHP hosting compatibility

The original ZIP includes a PHP adapter, but this GitHub upload currently targets Vercel/Netlify first. For PHP hosting, copy and review the corresponding backend from the original source package, fill `php-api/config.php` with your own project values, enable PHP cURL, and never commit live credentials. See root `README.md` and `sql/schema.sql`.
