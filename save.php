<?php
include 'db.php';

$name = $_POST['username'];
$cond = $_POST['usercond'];
$long = $_POST['userlong'];
$lat = $_POST['userlat'];

$add_query = "INSERT INTO public.entries(name, condition, geom) VALUES ('$name', '$cond', ST_MakePoint($long,$lat))";
$query = pg_query($dbcon,$add_query);

if ($query){
    echo json_encode(array("statusCode"=>200));
} else {
    echo json_encode(array("statusCode"=>201));

}
?>