<?php
require_once('config.inc');

/*
 * No need for this in a real integration use the platforms cart persitance
 * and SequraOrderBuilder to build the order again
 */
$order = unserialize(file_get_contents(sys_get_temp_dir().DIRECTORY_SEPARATOR.basename($_SESSION['uri'])));
/*
$builder = new SequraOrderBuilder(SEQURA_MERCHANT);
$order = $builder->build('confirmed');
 * Session is available here with the information needed to rebuild the order just check its status
 */
?>
<html>
<body>
<?php if($order['state'] == 'confirmed'){ ?>
	<h1>Congrats! order paid successfuly</h1>
<?php } else { ?>
	<h1>No luck! order payment failed</h1>
<?php } ?>
</body>
</html>
<?php
//Let's clear the session
unset($_SESSION['uri']);
unset($_SESSION['cart_ref']);