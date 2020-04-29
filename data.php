<?php
include 'db.php';

$get_sql = "SELECT name,condition,ST_AsGeoJSON(geom) FROM entries";
$resultArray = pg_fetch_all(pg_query($dbcon,$get_sql));
echo json_encode($resultArray);
?>