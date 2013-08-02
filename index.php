<?php

error_reporting(E_ALL);

require 'vendor/autoload.php';

$config = parse_ini_file('config.ini', true);

$app = new \Slim\Slim();
$app->config('debug', true);
$req = $app->request();

$redis = new Predis\Client($config['redis_client']);
$pubsub = $redis->pubSub();


$app->get('/', function () use ($req) {
    print "Hello from notifier";
});

$app->get('/message', function () use ($app) {
    $app->response()->status(405);
    print "This endpoint only accepts POST requests.";
});

$app->post('/message', function () use ($config, $req, $redis) {
    $message = new StdClass();
    $properties = array('title', 'url', 'body', 'source', 'group', 'timestamp');

    foreach ($properties as $property) {
        $value = $req->post($property);

        if ($property == 'timestamp') {
            $value = strtotime($value);
            if ((int)$value === 0) {
                $value = time();
            }
        }

        $message->$property = $value;
    }

    $message = json_encode($message);

    $received_by = $redis->publish($config['pubsub']['channel'], $message);

    if ($received_by == 0) {
        $queue_length = $redis->rpush($config['pubsub']['queue'], $message);
        print $queue_length;
    }
});

$app->run();