<?php
if($_POST['payment_method']=='cc'){
	die('Redirect to cc payment');
}
require_once('config.inc');;

//We use the builder to map the data
$builder = new SequraOrderBuilder(SEQURA_MERCHANT);
$order = $builder->build();

//Call startSolicitation to get the uuid for this transaction
$client = new \Sequra\PhpClient\Client(SEQURA_USER,SEQURA_PASS,SEQURA_ENDPOINT);
$client->startSolicitation($order);
if(!$client->succeeded()){
	echo "FALLO:";
	var_dump($client);
	die();
}

$_SESSION['uri'] = $client->getOrderUri();

//Data in $order is ok so we can get the identification form html
$options = array(
	'product'=>$_POST['payment_method'], //The sequra product we are going to uses i1 or pp2
	'ajax'=> false, //If the form wil be loaded via ajax
);
$form = $client->getIdentificationForm($_SESSION['uri'],$options);
//Lets use the propper html for each case
include('identification.inc');

/*No need for this in a real integration use the platforms cart persitance*/
file_put_contents(sys_get_temp_dir().DIRECTORY_SEPARATOR.basename($_SESSION['uri']), serialize($order));



