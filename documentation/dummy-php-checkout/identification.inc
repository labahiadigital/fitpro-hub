<html>
<head>
	<meta charset="UTF-8">
	<link rel="stylesheet" type="text/css" href="css/sequrapayment.css" media="all"/>
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
	<script type="text/javascript" src="js/sequrapayment.js"></script>
</head>
<body>

<!-- identification form -->
<?php	echo $form;?>
<!-- EOF identification form -->

<script type="text/javascript">
    (function(){
      var sequraCallbackFunction = function() {
        history.go(-1);
      }
      window.SequraFormInstance.setCloseCallback(sequraCallbackFunction);
      window.SequraFormInstance.show();
    })();
</script>

</body>
</html>