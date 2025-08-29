<?php
// MIME type fix for static assets
// This script can be used as a fallback if server configuration files don't work

$request_uri = $_SERVER['REQUEST_URI'];
$file_extension = strtolower(pathinfo($request_uri, PATHINFO_EXTENSION));

// Define MIME types
$mime_types = [
    'js' => 'application/javascript',
    'css' => 'text/css',
    'json' => 'application/json',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'ttf' => 'font/ttf',
    'eot' => 'font/eot',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'ico' => 'image/x-icon'
];

// Set appropriate MIME type if we have one for this extension
if (isset($mime_types[$file_extension])) {
    header('Content-Type: ' . $mime_types[$file_extension]);
    header('Cache-Control: public, max-age=31536000');
}

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Serve the file
$file_path = __DIR__ . $request_uri;
if (file_exists($file_path) && is_file($file_path)) {
    readfile($file_path);
} else {
    http_response_code(404);
    echo 'File not found';
}
?>
