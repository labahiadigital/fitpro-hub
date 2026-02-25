<?php
/*
 * This calss is intended to map our platforms data to the array SequraClient needs
 * Extending SequraBuilderAbstract can help to get all mandatory data
 *
 */

class SequraOrderBuilder extends \Sequra\PhpClient\BuilderAbstract {
	public function merchant() {
		$data               = parent::merchant();
		$live_site          = (isset($_SERVER['HTTPS'])?'https':'http').'://'.$_SERVER['HTTP_HOST'].dirname($_SERVER['REQUEST_URI']);
		$data['edit_url']   = $live_site . 'edit.php';
		$data['abort_url']  = $live_site . 'abort.php';
		$data['return_url'] = $live_site . 'return.php';
		$data['notify_url'] = $live_site . 'ipn.php';
		/*
		 * This should really be secured in some way signing the url with
		 * some persistent value i.e.: cart_ref
		 */
		//$data['notification_parameters']                         = array(
		//    "cart" => $cart->id,
		//    "signature" =>  hash_hmac('sha256', $cart_ref ,SEQURA_PASS)
		// );
		return $data;
	}

	public function getOrderRef($i) {
		/*
		 * The identifier we are going to use to identify this order in SeQura
		 * $i=1 will be the main identifier
		 */
		if ($i == 1)
			return time();
	}

	public function cartWithItems() {
		if (!isset($_SESSION['cart_ref'])) $_SESSION['cart_ref'] = 'cart_' . time();
		$data['cart_ref']        = $_SESSION['cart_ref'];
		$data['currency']        = 'EUR';
		$data['delivery_method'] = $this->deliveryMethod();
		$data['gift']            = false;
		$data['items']           = $this->items();
		$total_amount            = 0;
		foreach ($data['items'] as $item) {
			$total_amount += $item['total_with_tax'];
		}
		$data['order_total_without_tax'] = $data['order_total_with_tax'] = $total_amount;

		return $data;
	}

	public function productItem() {
		$items = array();
		foreach ($_POST['p'] as $key => $value) {
			$item['reference']         = 'REF ' . $key;
			$item['name']              = 'Producto ' . $key;
			$item['tax_rate']          = 0;
			$item['quantity']          = intval($_POST['q'][$key], 10);
			$item['price_without_tax'] = self::integerPrice($_POST['p'][$key]);
			$item['total_without_tax'] = $item['quantity'] * $item['price_without_tax'];
			$item['price_with_tax']    = self::integerPrice($_POST['p'][$key]);
			$item['total_with_tax']    = $item['quantity'] * $item['price_without_tax'];
			$item['downloadable']      = false;

			$item['perishable']   = false;
			$item['personalized'] = false;
			$item['category']     = '';
			$item['manufacturer'] = '';
			$item['supplier']     = '';
			$item['product_id']   = $key;
			$item['url']          = '';
			$items[]              = $item;
		}
		return $items;
	}

	public function extraItems() {
		$items = array();
		//Example for 3€ discount
		/*
		$item['type']         = 'discount';
		$item['name']              = 'Producto ' . $key;
		$item['tax_rate']          = 0;
		$item['total_without_tax'] = -300;
		$item['total_with_tax']    = -300;
		*/
		return $items;
	}

	public function discountItems() {
		$items = array();
		//Example for 3€ discount
		/*
		$item['type']         = 'discount';
		$item['name']              = 'Producto ' . $key;
		$item['tax_rate']          = 0;
		$item['total_without_tax'] = -300;
		$item['total_with_tax']    = -300;
		*/
		return $items;
	}

	public function handlingItems() {
		$items                     = array();
		$item['type']              = 'handling';
		$item['reference']         = 'Costes de envío';
		$item['name']              = $_POST['shipping_method'];
		$item['tax_rate']          = 0;
		$item['total_without_tax'] = 300;
		$item['total_with_tax']    = 300;
		$items[]                   = $item;
		return $items;
	}

	public function feeItems() {
		$items = array();
		if ($_POST['payment_method'] == 'i1') {
			$item['type']              = 'invoice_fee';
			$item['tax_rate']          = 0;
			$item['total_without_tax'] = 195;
			$item['total_with_tax']    = 195;
			$items[]                   = $item;
		}
		return $items;
	}

	public function deliveryMethod() {
		if ($_POST['shipping_method'] == 'normal') {
			return array("name" => 'Correos', "days" => '3 días');
		} else {
			return array("name" => 'Seur', "days" => '24 horas');
		}
	}

	public function customer() {
		$data = array(
			'given_names' => $_POST['customer-firstname'],
			'surnames' => $_POST['customer-lastname'],
			'title' => $_POST['customer-title'] == 'Sr' ? 'Mr' : 'Mrs',
			'email' => $_POST['customer-email'],
			'logged_in' => true,
			'language_code' => 'es',
			'ip_number' => $_SERVER['REMOTE_ADDR'],
			'user_agent' => $_SERVER['HTTP_USER_AGENT'],
			'previous_orders' => self::getPreviousOrders(1),

			/* The more optional data we send the less
			 * data will be asked in the identification form
			 */

			//'ref' => '',
			//'date_of_birth' => '1980-01-20',
			'nin' => $_POST['customer-nin'],
			//'company' => '',
			'vat_number' => $_POST['customer-nin'],
			//'created_at' => '', Customer creation date
			//'updated_at' => '',
			//'rating' => '',
		);
		return $data;
	}

	public static function getPreviousOrders($customerID) {
		//Lookup in db if this customer has previous orders
		$items   = array();
		$items[] = array(
			'created_at' => '20016-01-23',
			'amount' => 8803,
			'payment_method' => 'CC', //CC→Credit card, PP→Paypal,CC→Bank wire or checque,COD→ Cash on delivery,SQ→Sequra, O/XXX→Other where XXX is teh raw payment method
			'payment_method_raw' => 'Tarjeta de crédito',			
			'currency' => 'EUR',
			'status' => 'complete',
			'raw_status' => 'Entregado por Seur',
			'postal_code' => '48010'
		);
		$items[] = array(
			'created_at' => '20016-02-23',
			'amount' => 1803,
			'payment_method' => 'TR',
			'payment_method_raw' => 'Trasferencia bancaria',						
			'currency' => 'EUR',
			'status' => 'pending',
			'raw_status' => 'Pago pendiente de confirmación',
			'postal_code' => '48010'
		);
		return $items;
	}


	public function deliveryAddress() {
		$data = array(
			'given_names' => $_POST['shipping-firstname'],
			'surnames' => $_POST['shipping-lastname'],
			'company' => '',
			'address_line_1' => $_POST['shipping-address'],
			'address_line_2' => '',
			'postal_code' => $_POST['shipping-cp'],
			'city' => $_POST['shipping-city'],
			'country_code' => $_POST['shipping-country'] == 'España' ? 'ES' : 'PT',
			'phone' => '',
			'mobile_phone' => $_POST['shipping-phone'],
			'state' => $_POST['shipping-state'],
			//'extra' => '';
			'vat_number' => $_POST['shipping-vat']
		);
		return $data;
	}

	public function invoiceAddress() {
		$data = array(
			'given_names' => $_POST['billing-firstname'],
			'surnames' => $_POST['billing-lastname'],
			'company' => '',
			'address_line_1' => $_POST['billing-address'],
			'address_line_2' => '',
			'postal_code' => $_POST['billing-cp'],
			'city' => $_POST['billing-city'],
			'country_code' => $_POST['billing-country'] == 'España' ? 'ES' : 'PT',
			'phone' => '',
			'mobile_phone' => $_POST['billing-phone'],
			'state' => $_POST['billing-state'],
			//'extra' => '';
			'vat_number' => $_POST['billing-vat']
		);
		return $data;
	}


	public static function platform() {
		$data = array(
			'name' => 'Dummy',
			'version' => '1.0.0',
			'plugin_version' => '1.0.0',
			'php_version' => phpversion(),
			'php_os' => PHP_OS,
			'uname' => php_uname(),
			'db_name' => 'none',
			'db_version' => '0.0.0',
		);
		return $data;
	}


	/*This functions relate to the Delivery report*/

	public function buildShippedOrders() {
		// TODO: Implement buildShippedOrders() method.
	}

	public function getOrderStats() {
		// TODO: Implement getOrderStats() method.
	}
}
