<?php

error_reporting(E_ALL);

require 'vendor/autoload.php';

$config = parse_ini_file('config.ini', true);

$app = new \Slim\Slim();
$app->config('debug', true);
$req = $app->request();

$redis = new Predis\Client($config['redis']);
$pubsub = $redis->pubSub();


$app->get('/', function () use ($req) {
    print "Hello from notifier";
});

$app->get('/message', function () use ($app) {
    $app->response()->status(405);
    print "This endpoint only accepts POST requests.";
});

$app->post('/message', function () use ($app, $config, $req, $redis) {
    $message = new StdClass();
    $properties = array('title', 'url', 'body', 'source', 'group', 'noarchive');

    foreach ($properties as $property) {
        $value = $req->post($property);
        if (empty($value)) continue;

        $encoding = mb_detect_encoding($value);

        if ($encoding !== 'UTF-8') {
            $value = utf8_encode($value);
        }

        $message->$property = $value;
    }

    $properties = get_object_vars($message);

    if (empty($properties)) {
        $app->response()->status(400);
        print "No message specified";
        return;
    }

    $message->received = date('c');

    $encoded_message = json_encode($message);

    if (!isset($message->noarchive)) {
        $redis->rpush($config['pubsub']['archive'], $encoded_message);
    }

    $redis->publish($config['pubsub']['queue'], $encoded_message);

    print "OK";
});

$app->run();