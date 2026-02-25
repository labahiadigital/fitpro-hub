<?php
require_once('config.inc');

/*
 * No need for this in a real integration use the platforms cart persitance
 * and SequraOrderBuilder to build the order again
 */
$order = unserialize(file_get_contents(sys_get_temp_dir().DIRECTORY_SEPARATOR.$_POST['order_ref']));
$order['state'] = 'confirmed';
/*
$builder = new SequraOrderBuilder(SEQURA_MERCHANT);
$order = $builder->build('confirmed');
 * Any information needed to rebuild the order i.e.: cart_id or similar could have been added to the notify_url as GET param
 */

// First we make sure the cart we have and the one that has been approved by SeQura is the same
$client = new \Sequra\PhpClient\Client(SEQURA_USER,SEQURA_PASS,SEQURA_ENDPOINT);
$client->updateOrder(SEQURA_ENDPOINT.'/'.$_POST['order_ref'],$order);
if(!$client->succeeded()){
	echo "ERROR: Shoppingcart was modified";
	var_dump($client);
	die();
}

// If the cart wasn't modified let's create or process the order is in our platform
// I is paid an it will have its corresponding reference or identifier
$order['merchant_reference'] = array(
	'order_ref_1' => 'ORDER_'.time()
);
$client->updateOrder(SEQURA_ENDPOINT.'/'.$_POST['order_ref'],$order);
/*No need for this in a real integration use the platforms cart persitance*/
file_put_contents(sys_get_temp_dir().DIRECTORY_SEPARATOR.$_POST['order_ref'], serialize($order));