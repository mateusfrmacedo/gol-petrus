// Nova Aliança (SP): ruas, rodovias e pontos do OpenStreetMap (© colaboradores do OpenStreetMap, licença ODbL) e relevo
// SRTM (tiles Terrarium da AWS, domínio público). Origem: -21.0164, -49.4981. Coordenadas em decímetros, X leste, Z sul.
// Formato: tipo|chaves=valores (separadas por ^)|x0,z0 dx,dz ... (ver mapas/nova-alianca/README.md)
const CITY_OSM = `n|am=telephone|-9242,551
n|am=telephone|-3841,-389
n|am=telephone|-318,-355
n|nm=Kí-Delícia^am=fast_food|-74,-470
n|nm=Bar do Gustavo^am=bar|840,-652
n|nm=Auto Posto Larangeiras^am=fuel|-1131,1425
n|am=library|-155,548
n|am=school|-6234,-383
n|hw=stop|-3778,1678
n|hw=stop|-11300,-2332
n|hw=stop|-11093,-2212
n|hw=stop|-11391,-2193
n|hw=stop|-14887,-3009
n|hw=stop|-14998,-3336
n|hw=stop|-14738,-3164
n|hw=stop|-15134,-3153
n|nm=Polícia Militar^lu=military^am=police|1177,450
n|nm=Polícia Civil^am=police|-1192,795
w|hw=secondary^nm=Estrada Vicinal Antônio Molina^rf=NVA-010^sf=asphalt|2824,1071 1346,289 1548,305
w|hw=unclassified|9764,33728 239,-3576 261,-3638 86,-1252 72,-1238 251,-3850 160,-2661 93,-1437 80,-1096 95,-1157 299,-4350 69,-610 38,-507 265,-4381 118,-1431 190,-967 133,-578 120,-519 178,-625 127,-388 417,-1107 230,-534 327,-666 748,-1377 582,-1007 811,-1445 46,-71 677,-1267 2291,-4243 1296,-2319 1872,-3293 6873,-12395 1319,-2355
w|hw=secondary^nm=Rua Francisco Coco^sf=asphalt|-4798,-462 257,9 539,-92 158,-38 995,-246 1011,-224 991,-239 992,-229 976,-236
w|hw=residential^nm=Rua Jorge Galvão^sf=asphalt|-3245,2350 559,-97 559,-103 983,-253 996,-229 994,-211 979,-239
w|hw=secondary^nm=Rua Quintino de Socaiuva^sf=asphalt|-4384,1560 -78,-350 -125,-543 -291,-1113
w|hw=residential^nm=Rua Potirendaba|2971,2030 -147,-959 -227,-1063 -247,-951 -15,-58 -242,-921
w|hw=unclassified|-3547,9512 122,-55 107,-56 77,-28 79,-14 338,-27 157,-5 538,7 223,11 401,51 2035,373 465,94 481,125 516,155 1512,472 291,34 804,42 204,0 211,-19 589,-103 1069,-296 44,-8
w|hw=unclassified^sf=unpaved|2859,-14968 -3909,283 -4369,490
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^sf=asphalt|-27523,32776 807,-1157 542,-732 771,-957 482,-549 773,-785 858,-727 92,-78 921,-684 789,-531 597,-385 634,-398 688,-466 1226,-794 747,-440 1675,-1183 1272,-1033 481,-417 2306,-2128 271,-256 1482,-1412 2097,-1962 1170,-1074 817,-795 413,-382 242,-254 414,-485 153,-210 126,-171 251,-409 190,-325 230,-466 132,-324 92,-246
w|hw=residential^nm=Rua Gotardi^sf=asphalt|2597,8 -1004,221 -983,245 -984,225 -996,244 -978,257 -472,106 -520,121 -448,105
w|hw=secondary^nm=Avenida Francisco Pereira dos Santos^rf=SP-355^ow=yes^sf=asphalt|-3406,5943 -4,-50 -22,-269 -14,-138 -36,-329 -55,-605 -70,-894 -53,-509 -56,-559 -19,-232 -12,-169 -41,-657
w|hw=residential^nm=Rua Guilhemite^sf=asphalt|-5959,1158 747,-313 223,-86 402,-92 986,-245 989,-244 1004,-246 988,-215 1000,-236 979,-240 976,-242
w|hw=residential^nm=Rua do Comércio^sf=asphalt|2675,4891 -130,-594 -242,-1090 -229,-961 -249,-1028
w|hw=residential^nm=Rua 25 de Março|420,4998 64,-594 3,-110 -9,-102 -143,-570 -149,-636 -72,-311 -262,-1007 -226,-969 -246,-982 -227,-1009 -246,-990
w|hw=unclassified^nm=Estrada Vicinal NVA-030^rf=NVA-030^ow=no|-701,33201 1127,-1411 356,-529 1139,-1902 758,-1224 257,-464 101,-226 325,-785 125,-384 139,-553 592,-2941 222,-1251 216,-1077 29,-246 8,-274 -28,-404 -141,-1362 -282,-2050 -303,-2294 -205,-1710 -99,-607 -131,-892 -128,-965 -233,-1715 -248,-1555 -49,-339 -66,-597 -41,-255 -64,-298
w|hw=unclassified|-18343,24533 -4008,-2270 -6210,-3539 -902,-513
w|hw=unclassified|-14649,21877 -627,-290 -180,-107 -382,-268 -220,-184 -271,-206 -257,-158 -319,-162 -1357,-822
w|hw=unclassified|-24148,28596 -5822,72
w|hw=residential^nm=Rua Rio Preto|-2971,3271 284,1112 268,1195
w|hw=residential^nm=Rua Eugênio Traldi|-3219,2738 589,-129 29,1 26,17 17,31 25,210 28,172 61,252 263,977 293,1257
w|hw=residential^nm=Rua José Teodoro de Mello^sf=asphalt|-1401,3031 241,991 311,1359
w|hw=residential^nm=Rua Sete de Setembro|-2687,4383 506,-114 517,-123 504,-124 506,-115 492,-132 497,-153 983,-193 985,-222
w|hw=residential^nm=Rua Rio Preto^sf=asphalt|-3844,-583 243,1005 261,1005 95,923 26,388 37,451
w|hw=residential^nm=Rua Jorge Tibiriça|-1838,-1053 230,985 238,1011 226,954 233,998 257,1012 337,1406
w|hw=residential^nm=Rua Rio Preto^sf=asphalt|-4002,-545 -122,-1057
w|hw=residential^nm=Rua São Paulo|-3107,-1842 258,1013 237,1007 264,1022 221,950 207,1003 256,993 284,1324
w|hw=residential^nm=Rua 13 de Maio|-3660,3149 478,40 211,82 176,53 102,7 93,-8 156,-31 524,-139 519,-122 490,-136 481,-101 544,-119 968,-224 992,-205 897,-216
w|hw=residential^nm=Rua José Camarotto|-430,2794 268,981 328,1463
w|hw=residential^nm=Rua Hene Ayruth|-3191,5690 -4,-55 -129,-1355 -60,-533 -15,-49 -31,-30 -47,-19 -130,9
w|hw=residential^nm=Rua Antônio Birelli^sf=asphalt|-8144,590 1023,24
w|hw=residential^nm=Rua Paulo Donega|-4608,4640 -96,-936
w|hw=residential^nm=Rua Antônio Benjamin|-5822,2623 43,542 32,541 68,655 25,361 27,655
w|hw=residential^nm=Rua José Bonifácio^sf=asphalt|-4462,1210 -1497,-52 -516,82
w|hw=residential^nm=Rua Ibira^sf=asphalt|-8173,1875 18,-638 4,-85 7,-562 19,-551 8,-200
w|hw=residential^nm=Rua Rubens Gonçalves da Costa^sf=asphalt|-8125,39 949,43
w|hw=residential^nm=Rua José Bonifácio^ow=yes^sf=asphalt|-8921,1115 16,56 14,17 22,9 714,40 997,29 581,36
w|hw=residential^nm=Rua Felicio Helu|-6655,3157 876,8 1017,-18 508,-3 492,-5 102,10
w|hw=residential^nm=Rua Jorge Piton|-6669,3710 922,-4 537,-9 506,7 522,-4 469,-32 106,-10
w|hw=residential^nm=Rua Egilio Darim^ow=yes|-3133,5649 -62,-14 -120,-16 -58,-52 -73,-81
w|hw=residential^nm=Rua Professora Benedicta Jacir dos Santos^ow=yes|-8743,3245 428,20 608,32
w|hw=residential^nm=Rua Nadir Borrega^sf=asphalt|-7176,82 38,27 7,27 10,478 5,445 -10,73 -15,50
w|hw=residential^nm=Rua Sebastião Rosa Vitoriano|-5114,4684 -96,-987
w|hw=residential^nm=Rua Humberto Melão^ow=yes|-8705,2554 1047,53
w|hw=residential^nm=Rua Egilio Darim^ow=yes|-3410,5893 219,-203 58,-41
w|hw=residential^nm=Rua Lourenço Pala|-6700,4265 1021,96
w|hw=residential^nm=Rua Luiz Mantovani^sf=asphalt|-7141,1182 -17,84 -24,77 -71,1265 -57,1454
w|hw=residential^nm=Rua Guilherme Tameline|-5654,4722 540,-38 506,-44 543,-44 435,-40 93,-4
w|hw=residential^nm=Rua Rui Barbosa|-94,-2505 239,984 235,1002 230,993 236,983 236,994 236,978 274,1212
w|hw=residential^nm=Rua Egilio Darim|-3133,5649 714,-71 531,-52 508,-56 531,-89 532,-68 483,-75 142,-39 42,-36 55,-98 15,-67
w|hw=residential^nm=Rua Lindolfo Gonçalves|-4782,2604 20,543
w|hw=residential^nm=Rua Adolfo^sf=asphalt|-9312,-1640 -40,1103 -20,547 -24,547 -24,532
w|hw=residential^nm=Rua Bady Bassit^sf=asphalt|-10963,-592 1611,55
w|hw=residential^nm=Rua Fernando Floriano^sf=asphalt|-7690,1897 -483,-22 -489,-26 -283,-14
w|hw=residential^nm=Rua Etore Zafalon|-4254,3144 72,556 117,896
w|hw=residential^nm=Rua Vicente Mendicino|-8787,3846 1040,54 437,162 610,203
w|hw=residential^nm=Rua Jaci^sf=asphalt|-10968,1026 -2,-528 9,-555 -2,-535 -3,-530 -12,-808 14,-158 9,-89
w|hw=residential^nm=Rua Pedro Santos Albarelo^sf=asphalt|-6732,4807 32,-542 31,-555 14,-553 27,-533 51,-1322 13,-95
w|hw=residential^nm=Rua Manoel Pereira dos Santos|-5627,5377 2054,-211 91,-9
w|hw=residential^nm=Rua João Pereira^sf=asphalt|-14371,-3268 25,-1098 52,-1137
w|hw=residential^nm=Rua Franco Hermenegildo^sf=asphalt|-12848,-2868 42,-1105 102,-1837
w|hw=residential^nm=Rua Aperecido Rosa^sf=asphalt|-11180,-3538 -87,-26 -539,-147 -508,-126 -492,-136 -495,-126 -513,-127 -532,-140 -514,-117 -94,-17
w|hw=residential^nm=Rua Florindo Rosan|-7186,-3747 -102,456 -204,731 -103,412 -77,298 -161,530 -18,81
w|hw=residential^nm=Rua Nicodemio de Pauli^sf=asphalt|-13741,-6009 18,-51 29,-31 48,-15 22,5 39,6 348,104 533,181 484,171 99,32 390,157 510,182 115,28 456,139 266,95 891,347 875,313 1361,479 88,31 -17,89
w|hw=residential^nm=Rua Hedelbrando Murja^sf=asphalt|-13369,-3012 68,-1087 64,-1892
w|hw=residential^nm=Rua Joaquim José da Silva^sf=asphalt|-11821,-2586 15,-1125 75,-1739
w|hw=residential^nm=Rua Atílio Bigoto|-8618,-4346 -232,812 -90,342 -341,1323 -23,141 -8,88
w|hw=residential^nm=Rua João Palmeira^sf=asphalt|-12364,-2737 -82,-429 -5,-103 16,-110 45,-148 55,-108 14,-41 7,-161 94,-1802
w|hw=residential^nm=Rua Alberto Garcia Bonil|-10236,-1985 743,-2674
w|hw=residential^nm=Rua Sebastião Catelan^sf=asphalt|-13870,-3140 56,-1086 16,-1108 45,-593 12,-82
w|hw=residential^nm=Rua José Ferreira Guimarães^ow=yes^sf=asphalt|-14802,-5684 -52,-18 -16,2 -16,25
w|hw=unclassified|7638,4576 -12,-641 -64,-1948
w|nt=water|7735,5761 0,0
w|hw=residential^nm=Rua José Bonifácio^sf=asphalt|-8921,1115 -499,-26 -1548,-63 -957,-44
w|hw=residential^nm=Rua Humberto Melão^ow=yes^sf=asphalt|-7661,2527 -1039,-53
w|hw=residential^nm=Rua Humberto Melão|-7588,2588 335,20 625,16
w|hw=residential^nm=Rua Maria Luiza Aantunes Sperandeo^sf=asphalt|-7747,3900 40,-603 3,-108 46,-582 -3,-80 43,-541 -3,-42 -28,-34 -41,-13
w|hw=residential^nm=Rua Professora Benedicta Jacir dos Santos^ow=yes|-7704,3189 -598,-42 -431,-17
w|hw=residential^nm=Rua José Bonifácio^ow=yes^sf=asphalt|-6564,1207 -577,-25 -1010,-30 -770,-37
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt^br=yes^ly=1|1443,-3314 -115,263
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt|2769,-9960 -17,63 -33,809 -30,1533 -106,842 -73,398 -68,319 -83,306 -182,602 -734,1774
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt|1525,-3227 758,-1815 212,-630 212,-1021 123,-1053 12,-1087 -20,-565 -31,-502 -22,-60
w|hw=residential^nm=Rua Affonso Carneiro|-2686,2253 -134,-947
w|nm=Córrego do Cemitério^ww=stream|-4790,6124 1137,0 513,-67 1504,-34 726,-66 903,-224 936,-145 1137,-356 571,-104
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt^br=yes^ly=1|1435,-3006 90,-221
w|nm=Ribeirão da Borboleta^ww=stream|9957,-32083 -28,139 128,133 145,78 83,126 14,193 81,245 98,83 16,198 73,128 -28,310 70,337 134,85 356,493 73,791 175,278 -86,141 53,261 -84,315 -103,165 -33,449 -270,947 -101,533 36,697 -75,551 -150,469 -477,928 -22,145 33,201 -260,557 -66,237 -22,319 86,253 -14,89 -53,58 -315,-128 -38,59 41,134 212,170 95,382 -20,186 -116,337 -162,276 -17,108 46,137 -45,173 -92,172 -125,109 -21,106 262,406 -254,423 99,478 -12,89 -137,196 76,277 113,163 -40,257 -114,340 -200,88 -26,137 62,150 -2,223 -87,194 -74,41 -94,152 137,747 -43,302 -198,277 6,322 -66,157 15,539 64,298 -22,382 83,310 -55,200 114,179 -101,169 62,215 134,9 16,95 -192,102 167,912 53,948 81,624 223,435 109,457 -81,568 -103,335 -195,1698 -168,423 -281,290 -1497,739 -150,259 -304,307 -58,390 -341,530 -112,400 -78,937 218,340 95,362 -134,246 -201,558 140,417 -95,319 -139,116 -90,1650 90,379 33,424 92,231 0,217 377,577 44,151 128,134 184,50 89,78 28,228 -139,189 100,157 56,596 -39,224 56,278 -78,217 -179,39 -139,129 276,423 45,167 41,296 -78,131 -131,98 19,116 330,215 -32,254 -161,182 -156,13 14,306 103,360 154,209 156,83 134,135 10,306 -133,335 0,212 -96,183 -133,56 -8,530 -98,387 53,473 209,375 -73,103 -200,41 -3,115 81,158 147,140 166,621 -26,427 36,103 112,58 14,134 -62,114 -100,78 -70,156 3,504 103,37 134,-28 -22,290 -162,190 -25,629 -66,157 53,601 -88,139 232,586 -122,304 97,289 -111,174 125,389 31,633 -98,203 -16,201 -196,25 67,195 198,293 -97,181 -29,210 322,521 -191,565 -53,569 -66,212 41,523 -49,162 -15,379 -61,337 -95,189 -116,438 61,1204 114,694 -53,482 14,2168 -167,937 -265,780 -218,451
w|hw=residential^nm=Rua Alfredo Cozetto|1214,-2787 -1308,282 -999,223 -2014,440 -1017,240
w|hw=residential^nm=Rua José Fagliari|-6628,2624 806,-1 1040,-19 808,-14 161,-1 97,1
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=no^sf=asphalt|2769,-9960 14,-657 -19,-1638 -13,-982 3,-342 11,-565 31,-360 63,-464 255,-1073 256,-875 217,-519 638,-1409 1174,-2572 285,-724 178,-552 162,-575 172,-864 363,-2396 211,-1512 46,-569 0,-373 -35,-1021 -223,-1383 -451,-2084
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt^br=yes^ly=1|-3384,6227 -22,-284
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt|1147,-1865 2,-271 15,-124 52,-202 103,-285 116,-259
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt|1328,-3051 -114,264 -80,243 -46,187 -23,168 -3,176 6,111 9,49
w|hw=residential|-9460,9945 2317,923 2717,1054
w|hw=unclassified^nm=Rua Rio Preto^rf=NVA-030|-4536,-5681 156,1671 163,1613 93,795
w|ls=pitch^sp=soccer|-6646,903 0,0
w|nm=Cemitério Municipal^lu=cemetery|-2081,11028 0,0
w|nm=Córrego do Coco^ww=stream|-3931,-5783 1471,646 819,196 787,539 774,330 876,675 267,66 796,463 1657,809 536,534 1464,552 457,212
w|hw=residential|-9133,9087 1334,543 826,353 1906,723 1061,425
w|nt=water|7523,5221 0,0
w|hw=secondary^rf=NVA-352^sf=asphalt|-32641,-8815 895,359 2399,805 1148,366 2078,663 4155,1292 5037,1600 1321,390
w|hw=residential^nm=Rua Francisco Coco|1121,-1757 911,-202 24,2 21,11 16,24
w|hw=residential^nm=Rua Anceto Opporini^sf=asphalt|-14912,-3406 541,138 501,128 501,128 521,144 484,131 543,151 497,130
w|hw=residential^nm=Rua Mirassol^sf=asphalt|-10970,498 1574,59 1252,33
w|hw=residential^nm=Rua Mendonça^sf=asphalt|-8125,39 -1247,-29 -1589,-67
w|nm=Prefeitura Municipal^bd=public^am=townhall|1107,-743 0,0
w|bd=public|-313,646 0,0
w|nm=Escola Municipal Abdo Ayruth^am=school|-219,1147 0,0
w|nm=3º Idade^am=nursing_home|-1422,1090 0,0
w|ls=swimming_pool^sp=swimming|-6460,1600 0,0
w|nm=Creche^am=kindergarten|-5814,-254 0,0
w|nm=Poço Bocaiuva^lu=basin|-5684,-460 0,0
w|nm=Unidade Básica de Saúde de Nova Aliança^am=clinic|-4717,3097 0,0
w|nm=Praça Américo Marconi^ls=park|-589,4366 0,0
w|nm=Igreja Nossa Senhora Aparecida^bd=church^am=place_of_worship^rl=christian|547,-155 0,0
w|nm=Escola Mmunicipal Nicolina Maria de Jesus^am=school|-2889,4766 0,0
w|bd=yes|-1179,1466 0,0
w|bd=yes|-118,-429 0,0
w|bd=yes|897,-696 0,0
w|nm=José Eduardo Ramos Transportadora^bd=yes|1919,2604 0,0
w|hw=unclassified^sf=unpaved|-32315,7247 1734,-288 847,-87 679,-51 1908,-162 496,-66 736,-121 2751,-552 414,-72 207,-22 197,55 342,128 2432,956 2387,970 1906,735 460,92
w|hw=residential^sf=unpaved|12511,-145 783,-505 392,-242 531,-237 335,-172 249,-186 334,-317 548,-693 1075,-1431 408,-510 412,-536 826,-1019 356,-396 174,-149 181,-74 228,-44 210,-23 1095,-169 342,-27 1004,-76 3445,-231 1102,-84 1011,-55 531,-16
w|hw=residential^sf=unpaved|19343,-6656 -649,-1866
w|hw=residential^sf=unpaved|17500,-8536 545,1576 359,967
w|hw=residential^sf=unpaved|17578,-4974 -744,-2076 -358,-957
w|hw=residential^sf=unpaved|15753,-6669 1005,2741
w|hw=unclassified|21366,7968 209,82 166,54 257,50 2741,290 1971,221 1033,103 40,-8 35,-21 36,-47 15,-81 -20,-700 -27,-604 -35,-125 -57,-113 -60,-71 -99,-38 -3862,-548 -1401,-195 -286,-33 -175,-11 -139,5 -390,89
w|hw=unclassified^br=yes^ly=1|6716,10265 247,-59
w|nm=Córrego do Cemitério^ww=stream^tn=yes|2637,5128 157,-53
w|hw=secondary^nm=Estrada Vicinal Antônio Molina^rf=NVA-010^sf=asphalt^br=yes^ly=1|5718,1665 326,67
w|hw=unclassified^nm=Estrada Municipal Nva 253|-8012,15702 -1255,-894 -210,-121 -256,-116 -1424,-510 -121,-53 -116,-140 -3334,-4967 -91,-139 -157,-267 -43,-139 -21,-170 -21,-2266 3,-1343 2,-861 -8,-1020 8,-1862
w|hw=unclassified|-10220,-21549 2091,1193 2043,1232 175,131 115,170 377,4628 89,1141 74,726 110,1144 124,1200 203,1631 101,959 80,743 102,970
w|hw=residential^nm=Rua Lair Camargo Vessechi^sf=asphalt|-6271,-4395 49,6 54,22 42,44 184,310 255,453 255,456 244,450 193,326 24,69 10,108 32,596 45,1054
w|hw=residential^nm=Rua Natalino Marcato|-5942,-4013 -1346,722
w|hw=residential^nm=Rua Itamar Amador Fernandes|-5687,-3560 -1805,1000
w|hw=residential^nm=Rua Celestino Patini|-5432,-3104 -1679,961 -561,293
w|hw=residential^nm=Rua Nayde Nogueira Ayruth|-5188,-2654 -2385,1394
w|hw=residential^nm=Rua Sebastião Alves Nicolau|-4961,-2151 -765,422 -413,238 -706,422
w|hw=residential^nm=Rua Devanir Ferreira|-4929,-1555 -519,282 -667,401
w|hw=secondary^nm=Rodovia Nva 353^rf=NVA-352^ow=yes^sf=asphalt|-4884,-501 -843,-248 -388,-123 -730,-197 -728,-191 -260,-60 -1471,-408 -932,-257 -459,-126 -128,-35 -132,-31 -189,-46
w|hw=secondary^nm=Rodovia Nva 352^rf=NVA-352^ow=yes^sf=asphalt|-11168,-2121 204,33 1652,448 1461,401 939,253 955,279 370,98 408,98 301,65
w|hw=secondary^rf=NVA-352^ow=yes^sf=asphalt|-11306,-2256 -943,-251 -1955,-506 -668,-192
w|hw=secondary^sf=asphalt|-4878,-446 -6,-55
w|hw=residential^nm=Avenida João Brentam^ow=yes^sf=asphalt|-14886,-5675 -68,1175 -43,1026 -1,138 14,112
w|hw=residential^nm=Avenida João Brentam^ow=yes^sf=asphalt|-14914,-3234 2,-172 52,-1077 58,-1201
w|hw=secondary^sf=asphalt^jn=roundabout|-14893,-3082 10,-9 20,-25 8,-30 -3,-31 -14,-28 -23,-21 -19,-8 -36,-2 -34,12 -9,7 -25,35 -3,44 7,20 7,12 15,17 39,18 35,-1 25,-10
w|hw=secondary^rf=NVA-352^ow=yes^sf=asphalt|-14883,-3091 2734,693 818,223
w|hw=secondary^ow=yes^sf=asphalt|-14993,-3217 -162,-35 -417,-89 -36,1
w|hw=residential^nm=Avenida Francisco Gabarrão^ow=yes^sf=asphalt|-11207,-2282 27,-1256 74,-1702
w|hw=secondary^sf=asphalt^jn=roundabout|-11151,-2142 10,-25 -3,-56 -14,-26 -22,-21 -27,-12 -25,-5 -51,13 -23,18 -22,37 -3,44 10,29 41,42 28,9 30,1 29,-9 25,-18 17,-21
w|hw=residential^nm=Avenida Francisco Gabarrão^ow=yes^sf=asphalt|-11221,-5268 -46,1704 -57,1108 41,182
w|hw=service^ow=yes^sf=asphalt|-10695,-2111 148,-728 -7,-40 -19,-21 -39,-9 -29,12 -25,33 -157,718
w|hw=residential^nm=Rua Orlando Rosa Vitoriano^sf=asphalt|-10978,-1930 -523,-108 -528,-141 -502,-130 -960,-250 -516,-130 -744,-189 -147,-47
w|hw=residential^nm=Rua Manoel Teixeira da Silva^sf=asphalt|-14007,-2689 -39,1547
w|hw=residential^nm=Rua Antonio Almeida Prado^sf=asphalt|-15057,-1150 1011,8 522,-1 984,-7 511,6 528,3 535,19
w|hw=residential^nm=Rua Antônio Nery^sf=asphalt|-13491,-2559 -33,1416 -4,533
w|hw=residential^nm=Rua Antonio Francisco Oliveira Filho^sf=asphalt|-12531,-2309 -9,1159 -7,551
w|hw=residential^nm=Rua Paulino Monpean^sf=asphalt|-12029,-2179 0,1035
w|hw=residential^nm=Rua Atilio Perin^sf=asphalt|-11501,-2038 0,897
w|hw=residential^nm=Rua Bady Bassit^sf=asphalt|-15057,-638 1529,28 981,11 1584,7
w|hw=residential|-11925,982 -242,-690 5,-84
w|hw=residential|-12162,208 26,-44 173,-183 31,-46 16,-42 8,-97
w|bd=yes|-12376,-146 0,0
w|bd=yes|-12203,-343 0,0
w|bd=yes|-12173,-500 -5,76 91,7 20,1 7,-75 -113,-9
w|bd=yes|-12178,-424 -4,63 91,6 4,-62 -91,-7
w|hw=residential^nm=Rua Iracema Tiggi de Almeida^sf=asphalt|-6336,4953 19,450 -2,423 -30,82
w|hw=residential^nm=Rua Roberto Fujio Okita^sf=asphalt|-7939,5170 1622,233 232,4 222,-8 236,-22
w|hw=residential^nm=Rua Romildo Longhin^sf=asphalt|-8372,5431 83,153 36,32 59,19 1706,314 76,-1 63,-40
w|hw=residential^sf=asphalt|-8989,5506 -29,216
w|hw=residential^nm=Rua Ivan de Almeida^sf=asphalt|-9887,4805 -1431,-236 -2002,-336
w|hw=residential^nm=Rua Benedito Rosa da Silva^sf=asphalt|-13396,4769 1995,328 1551,254 69,3 58,-14 57,-33 94,-84
w|hw=residential^sf=asphalt|-13232,3721 -36,232
w|hw=residential^nm=Rua Orlando Rosa Vitoriano^sf=asphalt|-6336,4953 -14,-47 -28,-38 -58,-23 -296,-38 -921,-119 -552,-74 -618,-87 -661,-72 -528,-71 -1253,-171 -2003,-260 -1788,-237
w|hw=residential^nm=Rua Orlando Ramim^sf=asphalt|-8662,1849 -38,625 -5,80 -28,576 -10,115 -44,601 -36,681
w|hw=residential^nm=Rua Avelino Francisco^sf=asphalt|-9484,4455 69,136 109,161 114,93 116,56 177,52 244,2 183,-58 129,-118 138,-165
w|hw=residential^nm=Rua Rosa Traboleti Posar^sf=asphalt|-7653,4688 -88,212 -56,100 -142,170 -222,164 -211,97 -209,56 -156,18 -252,1 -198,-72 -175,-76 -210,-135 -228,-248 -87,-170 -125,-421
w|hw=residential^sf=unpaved|-11918,-6186 -25,-31 -211,-75 -1262,-451 -246,-89 -510,-182 -122,-51
w|hw=residential^sf=unpaved|-13403,-7771 -473,-183 -339,-119
w|hw=residential^sf=unpaved|-13230,-8408 -173,637 -259,939
w|hw=residential^sf=unpaved|-13706,-8576 -170,622 -296,940
w|hw=unclassified^sf=unpaved|-15279,8670 190,-105 113,-70
w|hw=residential^nm=Rua José Bonifácio^sf=unpaved|-15056,834 1531,71 951,45 649,32
w|nt=water|-17082,-28959 0,0
w|nt=water|-18481,-30704 0,0
w|hw=service^sf=asphalt|-3844,2197 97,-8
w|hw=secondary_link^sf=asphalt|-3830,2368 95,-10
w|hw=residential^ow=yes|-3315,5619 -117,5 -103,11
w|hw=secondary^nm=Avenida Francisco Pereira dos Santos^rf=SP-355^ow=yes^sf=asphalt|-3899,1554 28,214 27,429 14,171 17,221 51,550 49,529 83,888 57,610 38,469 31,340
w|hw=secondary^nm=Rua Gotardi^sf=asphalt|-3788,1532 -111,22 -334,77 -59,5 -39,-7 -32,-27 -21,-42
w|hw=track^sf=unpaved|2971,2030 784,26 103,-14 95,-33 131,-76 31,-37 17,-44 38,-492
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt^br=yes^ly=1|-3504,5975 25,263
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt|-3479,6238 90,1010 8,160 7,725 -9,225 -22,241 -142,913 -241,985 6,64
w|hw=secondary^nm=Rodovia Maurício Goulart^rf=SP-355^ow=yes^sf=asphalt|-3782,10561 38,-50 228,-681 91,-373 129,-959 15,-160 6,-163 -1,-780 -8,-157 -100,-1011
w|nm=Córrego do Cemitério^ww=stream|2794,5075 1469,-590 434,-135 491,-55 794,203
w|hw=residential|2822,-9398 668,-128 217,-35 1471,-205 1001,-151 72,-3 47,9 58,27 205,142 40,13 38,4 560,-77 599,-97
w|hw=unclassified|9828,-19720 91,132 27,172 2,861 26,460 37,183 73,141 115,114 128,72 973,67
w|hw=unclassified^br=yes^ly=1|9324,-19604 124,-28
w|hw=unclassified|4225,-18844 1230,-101 3869,-659
w|hw=unclassified|9448,-19632 380,-88 1047,-89 65,-38 74,-81 612,-882 162,-220
w|hw=secondary_link^sf=asphalt|2177,-5088 106,46
w|hw=residential^sf=asphalt|1319,-2747 -105,-40
w|nm=Praça Padre João Nolte^ls=park|448,-471 0,0
w|bb=fence|-9202,-1438 0,0
w|bd=storage_tank|-9178,-1306 0,0
w|bd=storage_tank|-9179,-1157 0,0
w|bb=fence|-7589,-1822 0,0
w|nm=Correios^bd=public^am=post_office|-3433,827 0,0
w|hw=services|-3899,1227 0,0
w|nm=Estação Rodoviária^bd=transportation|-4204,2489 0,0
w|nm=Praça Simão Daud^ls=park|-5547,1061 0,0
w|nm=Escola Estadual Gabriel Cozzetto^am=school|-5526,1249 0,0
w|hw=secondary^nm=Rua Francisco Coco^ow=yes^sf=asphalt|-4878,-446 80,-16
w|hw=secondary^ow=yes^sf=asphalt|-4798,-462 -86,-39
w|nt=water|16018,-29772 -317,-1016 167,-50 268,23 401,89 39,45 91,88 15,107 -256,535 -179,117 -229,62
w|ww=stream|23628,-32656 -2442,993 -3272,803 -1338,179 -558,909 -161,-12 -480,-435 -2167,882 -486,-17 -384,128 -240,173 -90,144 -167,17 -106,167 -184,458 -139,167 -100,36
w|lu=forest|-2093,10663 0,0
w|ww=stream|-21380,33257 100,-1628 123,-969
w|ww=stream|-24290,31038 1394,100 1739,-478
w|hw=unclassified^sf=unpaved^br=yes^ly=1|-10461,24997 -41,107
w|hw=unclassified^sf=unpaved|-11862,19332 222,350 41,93 73,189 362,1103 50,126 92,177 116,167 466,541 74,115 109,215 224,585 40,141 16,97 9,141 -10,128 -63,220 -207,663 -213,614
w|hw=unclassified^sf=unpaved|-10502,25104 -37,109 -157,236 -97,176 -11,51 -2,48 371,3506 1054,-53 756,-28 116,7 523,95 595,97 92,21 213,78 319,133 230,78 399,123 772,212 242,74 114,47 107,57 154,102 1044,899 138,90 1140,657 710,479
w|nm=Córrego do Bagaço^ww=stream|1082,30814 1057,632 897,708
w|nm=Córrego do Bagaço^ly=-1^ww=stream^tn=culvert|1018,30764 64,50
w|nm=Córrego do Bagaço^ww=stream|-21157,30660 513,-825 3356,-3211 3456,-1393 1851,-373 624,16 541,95 808,228 825,291 1856,825 2023,975 2532,958 3472,2269 318,249
w|nt=wood|-10131,24562 0,0
w|hw=service^sf=paved^sv=parking_aisle|-3516,9830 258,44 -79,355
w|sf=paved^am=parking|-3194,9897 0,0
w|nm=Velório Municipal^bd=public^am=funeral_hall|-3184,9986 0,0
w|hw=secondary^nm=Rua do Comércio^sf=asphalt|1825,1218 -232,-989 -234,-988 -238,-998
w|hw=secondary^nm=Rua Jorge Galvão^sf=asphalt|1825,1218 603,-152 122,-20 87,-2 187,27
w|hw=secondary^nm=Estrada Vicinal Antônio Molina^rf=NVA-010^sf=asphalt|6044,1732 365,75 1153,180 746,129 494,74 536,70 1126,141 711,78 715,65 764,73 8584,900 1871,134 4404,262 1996,126 931,100 1259,279 1269,296
w|hw=unclassified^ow=yes^sf=asphalt|-15034,-2697 112,-171 24,-57 11,-84 -6,-73
w|hw=secondary^rf=NVA-352^ow=yes^sf=asphalt|-15608,-3340 29,23 445,164 120,35
w|hw=unclassified^nm=Estrada Municipal Nva 253|-15056,834 0,-424 0,-515 -1,-533 0,-512 6,-620 -20,-520 1,-155 36,-252
w|nt=water|6496,19950 0,0
w|nt=water|5876,20149 0,0
w|hw=unclassified|426,31790 345,505
w|hw=unclassified|6963,10206 409,-105 248,-47 3780,-581
w|hw=unclassified|21238,3517 25,417 40,1917 15,416 52,1529 -4,172 -4,208 5,2064 32,960 105,1702 45,966 5,165 -12,253 -18,212 -274,1338 -175,731 -159,760 -242,1090 -232,1009 -273,1543 -145,915 -192,1385 -106,819 -107,1098 -50,310 -209,830 -315,1324 -339,1669 -274,1287 -89,404 -70,271 -106,482 -97,363
w|hw=unclassified|19619,25186 -165,53 -556,103 -838,113 -249,41 -608,67 -1594,233 -625,79 -2014,277 -981,126 -186,19 -320,69 -351,58 -868,90
w|hw=unclassified|-10435,29230 43,512 449,3565
w|hw=unclassified|-19174,33409 -520,-1429 -10,-61 2,-66 22,-66 35,-65 50,-67 63,-66 110,-79 122,-67 101,-39 104,-30 142,-18 79,-20 60,-27 37,-28 19,-48 -13,-55 -96,-144 -103,-188 -33,-85 -20,-81 -10,-77 6,-89 20,-73 46,-83 77,-110 109,-117 81,-101 9,-72 -9,-38 -23,-52 -45,-78 -313,-501 -22,-65 -7,-58 9,-70 22,-51 48,-63 79,-87 731,-682 678,-560 670,-380 457,-209 213,-69 151,-17 182,21 185,56 190,103 77,64 53,94 44,150 236,1433 165,1203 577,3819
w|hw=unclassified|-11591,19076 -152,-89 -224,-145 -289,-197 -87,-45 -70,-17 -83,-5 -99,17 -493,166 -188,48 -103,15 -114,-3 -97,-14 -120,-33 -170,-69 -241,-106 -271,-154
w|hw=unclassified|4354,30328 -181,-42 -131,-62 -78,-102 -215,-454 -451,-993 -362,-1004
w|hw=unclassified|11400,9473 1407,-221 1322,-235 6398,-989 516,-99 170,-54 157,-79
w|hw=unclassified|20990,-6875 114,-233 58,-195 41,-268 10,-716 42,-141 48,-70 87,-56 130,-42 1197,-78 2440,-184 2774,-232 102,-29 78,-82 53,-118 45,-246 121,-878 54,-126 86,-87 99,-32 245,-32 2113,-100 2333,-97
w|hw=unclassified|30984,-7620 -2098,183 -355,35 -448,65
w|hw=unclassified|21542,14286 2408,-266 2277,-221 1605,-163 332,-24 101,11 88,24 612,348 674,367
w|hw=unclassified|21399,11200 2300,5 3848,33 107,20 70,31 71,59 102,200 38,43 34,22 45,10 85,4
w|hw=unclassified|21362,8176 272,-3 591,52 2830,313 286,41 56,30 66,51 44,83 26,147 9,194
w|hw=unclassified|15799,-6740 -212,-78 -143,-21 -404,10 -2817,114 -1165,38 -87,-7 -63,-29 -52,-61 -30,-103 -21,-220 -134,-1135
w|hw=unclassified|-34208,29044 2278,-190 1499,-151 461,-35
w|hw=unclassified|-30371,16326 25,165 216,611 86,299 79,146 288,433 97,125 117,106
w|hw=unclassified|-28561,18724 -135,-10 -86,7 -80,23 -120,61 -170,129 -159,144 -123,156 -130,212 -110,206 -96,201 -54,77 -50,53 -114,88 11,30 12,148 -4,77 -24,142 -239,1014 -141,380 -21,104 19,418 54,461 71,722 16,117 51,111 101,106 205,127 1160,654 1048,608 881,482 2409,1365 1181,654
w|hw=track|-15064,2696 -306,-100 -873,-305 -903,-344 -5212,-1911 -965,-368 -641,-284
w|hw=unclassified|-14728,8901 -719,1757 -49,188 -42,641 -72,166 -184,241 -89,129 -81,153 -171,374 -303,786 -157,439 -440,1211 -98,381 -38,199 -35,143 -73,167 -155,227 -111,185 -98,235 -61,219 -100,446 -57,304 -170,772 -259,986 -52,233 2,72 19,63 59,62
w|hw=unclassified|-21966,-5330 -191,571 -264,852 -74,353 -93,351 -111,320
w|hw=unclassified|-23290,27869 -604,-302 -2338,-1266 -3214,-1847 -634,-399 -228,-109 -186,-61 -1011,-364 -2016,-737
w|hw=unclassified|-29988,20071 -258,140 -312,353 -386,502 -543,548 -236,228 -105,79 -107,55 -170,54
w|hw=unclassified|-26121,-6622 131,-530 58,-153 52,-118 217,-689 52,-128 30,-51 41,-42 73,-39 476,-175 91,-58 80,-71 35,-49 21,-55 7,-61 -6,-50 -107,-333
w|hw=unclassified|-22543,5826 -102,-89 -64,-35 -308,-116 -67,-36 -48,-41 -40,-55 -51,-143 -147,-322 -19,-79
w|hw=track|-15061,5920 -540,-190 -1932,-708 -2048,-762 -3586,-1313
w|hw=secondary^nm=Rua do Comércio^ow=yes^sf=asphalt|1121,-1757 26,-108
w|hw=secondary^nm=Rua do Comércio^ow=yes^sf=asphalt|1077,-1853 44,96
w|hw=unclassified|2754,-13579 370,7 789,31 152,8 189,20 41,-6 32,-20 102,-90 46,-19 43,4 39,35 29,124
w|hw=unclassified|-5256,-12328 598,-65 1859,-152 55,5 107,30 69,8
w|hw=unclassified|-4380,-4010 -653,-346 -618,-351 -470,-224 -538,-259
w|hw=residential^nm=Rua Humberto Melão^ow=yes|-7588,2588 -73,-61
w|hw=residential^nm=Rua Humberto Melão^ow=yes|-7658,2607 70,-19
w|hw=service|-2240,10615 -55,324
w|hw=service|-2287,9583 10,222
w|hw=service|-2277,9805 40,719 -3,91 -453,-94 -21,-8 -14,-14 -26,-212 -40,-449
w|hw=service|-3258,9874 464,-36 517,-33
w|hw=residential^nm=Rua José Bonifácio^ow=yes^sf=asphalt|-6577,1302 102,-62
w|hw=residential^nm=Rua José Bonifácio^ow=yes^sf=asphalt|-6475,1240 -89,-33
w|hw=service|-7257,-3867 -112,268 -147,439
w|hw=service|-7516,-3160 -27,42 -37,23 -46,13 -271,4 -173,-26 -137,-39 -212,-99 -41,-37 -88,-180 -15,-51 4,-110 97,-253 35,-35 41,-18 55,2 962,325
w|hw=service|-7595,-2148 -202,-54 -20,-17 -9,-17 -1,-26 110,-454
w|hw=residential|-12088,-6638 17,68 -4,30 -79,248
w|hw=residential|-12121,-5607 201,-500 9,-38 -7,-41
w|hw=residential^nm=Rua Nelcy Perin Carreta|-11265,4213 -53,356
w|hw=residential^nm=Rua Nelcy Perin Carreta|-11434,5309 33,-212
w|hw=residential^nm=Rua Nelcy Perin Carreta|-11318,4569 -83,528
w|hw=service|186,2986 154,-3 37,8 25,16 20,29 82,448
w|hw=service|-4803,12502 163,142 52,31 89,29 572,148 260,61 105,12 247,10
w|hw=service|2350,-943 346,-62 30,-25 11,-40 -9,-35 -28,-29 -89,-65 -34,-32 -104,-124
w|hw=service|-3974,2590 23,-314 6,-21 14,-22 24,-16 63,-20
w|hw=service|2545,4297 98,-7 17,8 16,19 105,343
w|hw=unclassified|-16595,13775 1275,-157 1326,-173 798,-60 164,6 148,34 748,286 858,297
w|hw=unclassified^ow=yes^sf=asphalt|-15007,-3106 -3,150 -24,259
w|hw=residential^nm=Rua José Ferreira Guimarães^sf=asphalt|-13798,-5334 -92,-32 -292,-99 -112,-38 -78,-27 -162,-58 -221,-79 -47,-17
w|hw=unclassified|2764,-12255 -1818,138 -96,12 -81,22 -266,117 -122,27 -133,7 -329,-68 -96,-1 -568,48 -67,-8 -52,-31 -23,-52 -30,-415 -26,-79 -44,-43 -84,-27 -1497,106
w|hw=residential|-8302,3147 -13,118
w|hw=unclassified|3376,9650 521,72 2475,440 127,39 173,72
w|hw=unclassified|6558,-31385 154,-39 83,-5 161,19 788,156 1143,196 644,129 136,45 135,74 157,108 135,58 129,31 285,9
w|hw=unclassified|2796,-14504 991,-88 88,25 205,152 98,48 102,11 681,-25 1040,-63 714,-59
w|hw=unclassified|10598,-30604 266,3 402,17 212,3 101,-7 127,-42 1484,-581 691,-292
w|hw=unclassified^br=yes^ly=1|10508,-30604 90,0
w|hw=unclassified^sf=unpaved|-8146,-32009 -2275,10187 57,139 144,134
w|hw=residential^nm=Rua Alberto Pereira^sf=asphalt|-7169,-3836 66,-89 60,-60 88,-59 600,-338 84,-13
w|hw=residential^nm=Rua Antonio Francisco Oliveira Filho|-12547,-599 -8,504 -10,539 -9,506
w|hw=residential^nm=Rua Antonio Nery|-13528,-610 0,513 1,526 2,476
w|hw=residential|-12565,444 -962,-15 -1529,-19
w|hw=residential|-12555,-95 -973,-2 -1528,-8
w|hw=track|-15058,4577 -1069,-382 -7117,-2551
w|hw=track|-16127,4195 -21,-219 49,-191 267,-254 75,-142 45,-171
w|hw=unclassified|-6121,-4931 206,-341
w|hw=unclassified|-4718,-7394 -932,-56
w|hw=footway|-4638,-6651 181,34 144,-48 121,-111 96,-121 32,-102
w|hw=residential|-13608,-6150 -92,-27 -1257,-428 -11,673 -2,153 116,77
w|hw=footway|-14957,-6605 128,291 149,170 139,95 170,69 199,41 160,-7 108,-43 204,-188
w|hw=footway|-13890,-5366 -43,-153 -88,-181 -58,-55 -71,-67 -103,-79 -30,-22 -112,-43 -48,-17 -164,-32 -143,9 -157,38 -61,36
w|hw=footway|-14607,-6015 -72,170 -76,178
w|hw=footway|-14395,-5966 -72,194 -67,184
w|hw=footway|-14253,-5901 -119,371
w|hw=footway|-14079,-5755 -103,290
w|hw=footway|-14467,-5772 -212,-73 -289,-87
w|hw=unclassified|-15155,-3252 27,-666 -48,-340 11,-1103 -21,-1182 -53,-207 -133,-240 -207,-185 -280,-106 -272,-133 -403,-254 -1442,-531 -1755,-599 -2227,-817 -1379,-482 -579,599 -848,718
w|hw=unclassified|-28199,-7285 370,-2324 981,-48 -74,1639 990,713
w|hw=unclassified|-26848,-9657 546,0 371,-244 318,-128 244,-52 245,169 121,351 133,337
w|hw=unclassified|-27829,-9609 133,-668 68,-961 170,-297 297,-392 408,-917 117,-80 796,170 106,175 121,85 255,-112 2110,733 388,487 -477,1289
w|hw=unclassified|-27739,-11221 -143,1071 -144,138 -716,-133 -132,233 -138,32 -2720,-737 -159,91 -574,1569
w|hw=unclassified|-34003,-13736 3612,1316 2273,1002 379,197
w|hw=residential^nm=Rua Antônio Chaes Ferreira^sf=asphalt|-13268,3953 -52,280 -76,536 -35,225
w|hw=residential^sf=unpaved|-13624,-6101 16,-49 192,-593
w|hw=residential|-13328,-6793 60,-174 31,-31 36,-12 53,7 1060,365
w|hw=residential^sf=asphalt|2042,-9028 -71,1288 -569,1287
w|hw=residential^sf=asphalt|940,-6657 983,-2273 14,-89
w|hw=residential^sf=asphalt|1366,-8969 -913,2097
w|hw=residential^sf=asphalt|845,-9090 -862,2011
w|hw=residential^sf=asphalt|376,-9294 -870,2006
w|hw=residential^sf=asphalt|-104,-9502 -871,2001
w|hw=residential^sf=asphalt|-662,-9490 -779,1783
w|hw=residential^sf=asphalt|1366,-8969 571,-50 105,-9 677,-60
w|hw=residential^sf=asphalt|-1268,-9404 606,-86 443,-62 115,50 480,208 469,204 306,132 215,-11
w|hw=residential^sf=asphalt|-1771,-7851 11,-67 -12,-374 504,-1112
w|hw=residential^sf=asphalt|-1889,-7924 16,28 102,45 330,144 466,206 481,213 477,209 470,207 487,215 462,204 1040,457
w|hw=residential^sf=asphalt|-4819,-8353 2779,-412 32,1 31,9 49,42 14,31 5,34 20,724`;
// relevo: grade 81 x 81, passo 80 m, de -3200 a +3200 m; 2 caracteres por amostra (base 88), decímetros acima de CITY_DEM_MIN
const CITY_DEM_MIN = 415.887, CITY_DEM = "0G0A0Y0-13141f1O1N1_1!1V1@1T1Y2B2I2^2_3p4y5B6K6#6-6)6(7o7H7Q7(8i8v8;8O8E8D8B8d7.7X7;7H6W6#6T6e5}5]696G623[333U4T5a5e5v5k5O5l5b5D515q5d4+5u5P5.635^6Q6>6[767f7r7r7D0z0W1h1k1F1+25292b2:2L2q2l2g1X25202z303u50566b6k6/6R6F77787O7~8q8B8[8:8{8(8H8w7{877>7Z746#6V6x6a6d6K5w5F4o3k3%4v4#4Z5f4U4)4y4H4X4X4[5l5B5u616f6w6+6Y6)767j7w7M7I770P0R1p1Q1]2y2w2:2Y2>2&2~2?2-2B2f1:2K3c3=5E636n6H6R6q6T6/787R7}8s8O8L8V8=988N8C8h8q827?7J6]6#6G6h6f7o624_3+2@3o3#4b4b3[3Z4a4q4V4)4?5I5X5#6a6g6G6#6#6$6_7l7b7A7J7h6~0u101k1@2g2T2[2{363!3m3B3N3#3o312j2b2^3W4.6n6z6)6N6j6C6Z7r7j7]8t8P8k8}8=8+9r8V8?8L897$7T7j7e6R6f5)6E5n4!3(2_2S3P4k4o3{3{4B4:4^565D5^5{6l6f6A6K6S776>6~7b7z7Z72756;0)1y1#2y2:3h3r3E3L3(443~3_3/413r2[2J333B4O5.6!6:6r6f6U6]7V7C7}8h8T8D8%8}8?918^948C7~7:7A7q796+6w5[5F5d574n3g2A2{3z3W444r4@5c5w5Z636k6n6&6.6#6/6^7f6^7c7z7&8f7!776$0.1O1[2<3f3r3T3%414g4q4E4D4n4s3:3U3z3f3v3X5y6R6T6v6M6W777M7$8p8m8o8O948_8.8>8_8]8&8u8d7*7w70736R6n5F5m4+4n2?2E2*3T424x555G5R6c656d6R6M6Q6U6/797n7e7a7k7t7Q8z867!6%0t1~2S2<3a3;3<4q4t4E4D4.4}4Q4G4r4l3}3V3V3R4p6A6]6$6A6Q717C7U7;8e8K8N8:9e9f8}8/8X8W8t847;7q6^736!6e5P5l4$3*2{2(3f3*4V5E5~6w645-6w6v6$736^726{7h7e7z7r7O77808r8h7^6x0C1t2c2?373/3+4b4R515j585f5a4/4+4]4u4o3M3.4u5r6i6F696Z6>7i7R7W8I8F8-8<8!8#8@8R8L8I8f857?7y7r6@6M5_5E5q4R3E2;2;3D40555{6o6>6X6s6U6:6[7d757j7q7l7q7e7z7r7!8p82837r6v0-1J2D2<363v3V434%5a5c5k5k5s5b59574%4C3>3>4r4I5t6s5]6d6*747p7B7_8b8W8I8;8<8X8v8A8v8f7@7:7A7t6.6Y6d5&5f4#3&2;2(3E4t5@6R6%7c6^6I6#6-797f757q7f7d7q7r6{7t7W7{7=7+6#640Z1v1N2s2E3g3s3;4Y4:5s565y5?5H5J5F5k5b4/4Y4q4h4T5v5P5:6S747k7J7?8v8r8K8n8L8y8B8r7;7-7=7*7u796(6y5~5l4Y4l3v2;2<3F4J5~6H6.706;6H6-7f6^7z7i7z7z7p7t756{6R6[7y7i7F6e6l0v0_1F1K2H2G3o3-4r4@5B5y5W5]5&626b5R5z5s5l4V4V4Z4]5y5A6l6R707j7z8c8i8w8p8l807<7N7C7A7j77746X6P6c5}5q4X3>2~2!2]4f4;5p5#6m6m6V6#6/7c7r7J7z7K766_6[736+6x6R6Z6o6q64680l0$1V2m2;3d3F484s4?5t5w5S5{5{6o6^6V6T6t6o5D5n5O5N5D5z5*616z6.7d7R7Q8a7&7!7Q7L7y7G7h6_746/6K6s5}594~4t3M3f2B34435o5w6j6L6n6=6~6(757p7p7j6^6}6.6(6F6j5^5R5$5/5/5.5<0l1f1[2>3d3r3(3#4I4$5g5f5?5^5^6H79707h7a6^6U6y6e67686i69636A6x6@727r7r7C7c786_6]6L6{6R6T6y6H6k5T584U3@3x2W2}3q4A4/5[6+6:6.6^7f7v7p7H7H7u7n6#6[6G5}5S5M56555o505i5I090?1S2X2.3h434k4g4V515F5$5W6c6=7M7p7R7x7t7r7y796B676R6f6s6F6t6R6&7l7m7f6*6O686a6x6m6x6b6m675*5W4-4$3]3p2A2{3{4v4U5w5&6H7A71767t7z7W7L7L7V7a6S6d5*5H5W5Q4=4%4!4;4)060t1k2h2H2}3+4q4r4F4=5o5G5u6S6%7w7T7{7R7X7#7%7*7v6?706Z6[6.6}7c7n7m6&6%6F6q5<5^5<5)5[5Z5+5W5l4.4-4z3%3p2B3m474K4{5E696d6T6&7e7s7R7^7;7O7<736.6M6f6g5?5K4[4M3}4O4N0v0a0K1G1[2T3B424e4F4]5l5T6n6t78787z7$7P8f7V7Z7[7u7n7n7E7r6@7W7B7M7U7M7c6=6K5[5$5e5r4[4*5k4=4(4E4i4b3J2U2s3m414W5l6b6f6z6M747f7g7J7;7/7)8o7O7p6S6W6y6g5<5I594k3V3;0e0q0K0>1s2d2R3y3;3@4x5e5z6;6<6^7r7S8d7S7T7K7!7%7+7z7P7Q7.7@7]7.8b847#7Q7k6{6O5<5D5w4.4s4E4%4v3@403O3r2Q2K3v4A515*63696F6M6%7f7A7#847T7(7W7Q7p756>6y6Y5+5+5r4%4f3-2(1$0R0H0=151}2s323;4f4N5m6D7b7p7n7$7^7W7F7%7/7]807W7)897~8r8B8t8G8C817~7$7h6/6T6c5;5X544Y4n463V3D3v2*282J373X4/5w5[616q6!7d7r7U7%7?7~7~7L7G7l73746^6/6O6g5$5b4B3Z2(2+1+1h0P19161?2M353_4G4;5B6Q7h7b7O7R7V7Y7%7{7{7{7?7{7^8k8F8L8)8(8/8-8E8e7Q7j6-6E665+5A524d3^423K2=2=202w3B4d4@5o5Z5~6q6P6-7a7D7J7*7{7{7D6^6/6/6:6{6?6K675X5j4<3[3h2I242M1?151e1S1[2l3g3L4H4:6z6!7b7k7I8a8c7{7%7(7%7K7@8r8u8L8*8:9j968:8B8A7.7E6{6#6B5{5&5D4^5F4y3+3e2!202I3c4f4$5b5x5[6d6E6^747B7H7-7{7=7o6-6#6k6n6P6v6H5~5/5F4*4s343d2}2;2U1Y222g1{2D2u303%4f5Q6N6?7V7X8r7_818n848d7@8a8L8O8]9396969o918)8m827*7L716%6x5{5v5v5G4U493U2R202w3H3(4B4#5D6g5_6s6P747n7z7X7}7M766@776f5=6d635{5!5&5x4N3:3z3O3T3w3J2T2R2M2h1}2p2X3T4G5&6N6D7c7I7<8c80878g8k898u8/8N8.999t9E9K9s8*8(8L7]7z7y6>6H6n5&5.5T4/4R3#2;1@2I2=3J4q4&4@5C5W6i6C6$7t7J7L7%7V786_6X6D605&6d5B5x5L4=4m3V443#3#3;3[493T352~2D2Q2q2[3[5c5{6Q6s7g7V7Z7%7{8h8g7{8b8%8$948~9z9D9b9i8=8%8s827R7b6^6T6F6G6J5M4]4X3^2*262f333s3P484*5n5j5!6B6B6]7y7J7Q7W7l7q6(6i6e5O5a4O4E4U4q46333}4t4S4J4S514B3#3O3c2>2*374c4R5M6i6o717k7m7X7.8n8v878A8V8L8)9l9S9H8}8L8;8$8D7{7Y7B7q6}6X6q6a5&4)4x3!2B1<2D3F3U3[4N4L4(4]5K646x6.767T7S7%7Y7J7f6E6x695E5n4)433K3b3Q3A4u4l5d5P5K5l3]4e3^4j332~2]3H4$5J5G5:6e6!6=7G7(7$8l8I8X8L8?8@8>8]8P8!8+8S8m7{7U7R7d756$6H6g5g4%4J3W2K2e313?3~4m4Y4N4&5s5y5+6e6>747#7;7%837.7W756/6v5U5S5n4D4E4z4m3h3X434U5J5P564u4E4m3]3y3#373p3?4C4;5D656Y747t7o7G7/8t8J8u8M8/8(8O8D8L8x8r7/7)7%7J7d6^6V635&5O504S3w2J2f354c4C4W4!5s5P5[5U5:626=7J7#7_7/8j7_7U7p7d6H6N6q664/4Q4Y4]3m3?4t4b4[514M4(4?4)4w4q4q3?4d3>4t4+5n5O6s6U6_7F7-84828H8S8a8v8y8a8B7~7{807^8c7%7z7d6X6H635<5&4:4a3E2z222=3;4S4?505C5(5<5?6a6J78767j7J7&88887=7H786K6q5P5D5r5r5D5M3[454i4Q484;4?4+5l4}4-4/4Z4*4X4d4f4W515w666P6/7o7y7V7=8v8d8g8a7}7:7{7?7L7x7R7H7R7F6)6G6z6d615U4U4D3u2L1@2&3U4A4_5i5B5-5.6j6l6S6(7z7f7t7D7-7%7J7I776?6w5~5[5:5-5G694H4X5a5B4L4U4V545A585l5h4/4@51534*4X565g5?6R776^7f7A7;7+7+7-7K7F7J7{6{7H7J7c7e6_6/6H6Z6n64635R564P3t2$2c2u3P4~5E5g5Z5~6a6L6>7m717b7q7J7F7T7&7q7p7f6#6H5{63695>656f3@4u4*524w4Q5c5h5x57595n5f5m5r5V584!515t5{6*6(747x7O7V7S7$7M7p7i6;6/6M6+6(6+6/766U6!6Q6q5.5}5N4@4u4u3q1{2w3z4r5f5i5H5=6q6S6^6#6(7d7T7f7o7p7n7i7i6&6R6A6x6k6x6i6g5}2.3c4e4o4t4#5l5B5r4^5f5r5B5Q5L5U5h5D5E5B5*6b6L6.6=7o7q7n7g7e6}6.6;6X6G6c676n6B6(6x6y615[5U5V5e4<4I4k3z272f3r3[4H4>5r696e6E6Z6#6[707e7a6~7k6=75736*6Z6y6l6j6n6b62632#2^3S3Y474x4*4]5i5y5D5K5P5O5?6b5%5+5.5@6h646R6:6^7n6:7g7B6=6M6N5[5]5%5=5Q695W5!5?5Z5Z5]5*5p5j4!4a3I2}271^3p3_4q5s5x6i6k6y6S6[6_6~6^6]6^6T6>6}6L6R6Y6j645~5.6d6a5@2/2~3P3]424e4z4!5b5B5Z5M5-5<6a5]6l6m6g5^6p6=6A6Z6$7p6/6~746D5V5W5B5p5d4~5y5o4:5s5u5z5H5U5H4_4/4B433)2+2a1_313&4r4~5r5S666l6#6V6T6<6#746X6I6C6!6v6A615[5{5*5K5N5V5P2f3o3E3q3N3(4x4N4;545p5H5Q5[67636j6e6M6z6x6.6#76747z7p7c6;6S6Q5:5]5y5f524L4L4E4)4Y4+4?4@4*4#4M4a3&3z2g1^1}2&3r464#4=5N5Z5[6r6H6&736Q6I6N6d6p6e5[616g5G5I5N5F5w5x5A1f2r2O2L3p3E3?4k4W4:4]5v5[5-5~6i6l6Q6U6>6M6/767p7p7O7x7u7z7d6>6W6x645<534>4o4540464L4G3]4N4F433Z3l2z251>2c2J2S3Q474x5D5I676u6C6V6]6<6R6G6a5^5;5Y5v4=5n4.4S4#4$4_4=1c151@2z2O3i3z3+494N4(5J6a656m6P6#6Q6]6<6>7m6:767l7Q7J7z7Z7z6_6<6R6I6H5:5I4#4Q4u3[3L3j3/483<3B2S2H1.1$1$2L2[3q3G494(525I5+6q6Q6B6Q6$6R6y5_5Z5Z5B5c4J4t4i4n4b4f4w4o2z1f1r1<2-3z3Z444g4{5b6a6E6s636D6*6$6)7k787f7k7D7E7%7E7O7M7+7D7n6-6<6H6s625W5f4?413%2?2~3j3C2{2B1^1W1^313u3U4P4?5k5a4?5D5Z5/5}6m6P6)6J6z6i5{5W5p564M4j3~3K3B3T3/3O2_2(1(1V2?3a474t4X5w5X6c6t6m6j6T6.6[757y7/8n7/7U7#887@7{7;7_7Y7j6_6_6:6T6d5:5z4@4U433Q3n2?2r2K2k1.25374C4>5N5^666o5z5p5J5Z5[5$6r6y6H6R6R686d5^5L5D4W4R463M3k332:2Y2.3c2x1+2R3q3=4k4[5w5P5Y676y6R6)6Z7I7T8c8]8V7{8l8h8A8h8a7%7{7:7W7N7O716X6F6l5>5F534G3}3F3r2v1:1X1^2p384f4H4(5h5Q5G5D5N5Q5{646r6F6W6Y6J6j6b6c5$5Z5P5h4F4k3F38342L2j3v3y312F2x2^3m4q4?5E5w5R686q6X747v7T7:7=8s8h888h8a8e897=7T7:7A7%7M6]7B766*6w6j5$5s594:473L2%241N1K2u3s3.4k4z4[5v5d5$5+5:5Y5]6u6y6z6R6X6A6m6d5@5Y5*5a4x4a3T3q3l2<2-4+4P3<3I2J2;353I4Q545s5&616G6*7a7z7%7;8h8m8h8z8o8n8f8787867-7W7_7z7q7x6_6#6z6d605E584Z4e3.3v2t1S1B2Y3i3]4u4?4?4.5o5y5F5-5;6x6y6t6H6V6^6R6O675[5-5>4_4L493-3(3Z3J3T4Z4)4+473(3o3i3$4l4;5s5_6v6I6=7A7N7V8b8i8h8A8N8!8A8f7~857.7^7U7(7x777e6&6R69635&5E53574U3U2_2w1v1$2T3$3/4N4t4+545~5z5L5*5*686f6o6#6;7a6N6p6l6l5X5I574<4z4y4k4*4$424/5l504Q3>3%3v3}4g4W5M5W6s6P6?7q7L7*8m8W8)8[8[8Q8r8r7<7=7)7:7z7n746<6?6O6F655/5-5v514-4h3.3b2i1P1W2$3D3P464q4w5n6q5T5t5O5#6x666>7:7-7#6Z6s6l5_5S5e5e4Y4R4D4$4*5a4y4*5a5k4)4B4f3=3W4z4n5k5$686G787r7~7}8s8O8-8?8?8V8i8j7{7S7G7G7k7e6;6Z6H6n665&5K5#4:514r3W3w322K2H2B3x3J3r3;3;484V5x5y5F5n5G696a6.7R7W7!6=6p6q6j5-5G594~4~595l4~584?534>4)504^4&4?4u3{4l4)5z666N6?7g7V7}8q8Q8?8@8U8o8l7~7=7U7y776.6Y6&6J6k6k5]5I5u5h4<4V4y3}2]2(211R1N3o3F3K3m3U3/45454%5i515D5W5:6b6/7m7l6W6O6r6d5=5.5p5w5q5y5t5t5F4~4-534/5e5d4~514J4Q4W5f5T5=6g6[7S7T7>8w8?998~8U8N8B8d7<7H7u6^6?6k6j6r5(5z5!4Y4(4A4J4K3Z3w2G2e1B1I1$2A2(2(2>3h3p3S3&4a4t4?5c5w5Q5&656B6H6H6F6i6n6c5-5=5P5O5P5v5Y5y4_4v4?4}5e545e5o5e4.4Q5d5!676Q6]7C7R888L8W8{908+8N8e8k7=7z7i7c6:6l6d5@5&5o4*4V4A4y3]3T3m2M1^1Y1T1w1j1s1=1:2F3l3V4a4a4N4-4$5b5H5J5;5]6F6S6Z6#6H6z635}6p5_5.5<5R5/5j564D4$535v5v5F5I5D5t4~525T5=6k6[787P888h8L8=978U8L8z817T7y7i6W6R625P5p4-4$4E423#3!332P2_2;2R2n2t1w140}1G2S3A3S3W4a4Q4+5b5b5D5H5;6q6R6q6R6z6g6p6Q6n6u6b6i5Q5.5Z5F5G5k3_4N4.4[5l5r5N5/5#5-5m5K5Y616O747q8h8q8V8_8+8N8a877>7&7p7j6#6C5$5#504Z4x4D3?3*3(3X3E3W3q3h3k2Q1Y1e151U2J3C413$4I4<5b5n5K5-5^6F6i6n6n6#6H6#6u6>6x6H645-655;5N5r5v553G4s4*5;5w5l5m5L5U5.5*6v6y6I6&7e7$7?8B8U8R8O8O8w8b8l7W7m726)6T6n5%5z5d4$4<4W4C493>3T443(3t3n2S1?1m1H2M2)3A3/484Y4}585@5/5B5*6r6y6x6B6J6O6x6H6!6#6B6j5[6m5J5b4]54513s3~4l5v504;595m5;5]67656e6y717j7J7*8g8n8L8S8Q8t8b7:7M7q756R6v6w5E5%5O5C5j4{4S4K4p4n4n4n3<3J2;2p1o1V2p2=3M4o4N4?525C5J5>656e6n6R6G6H6v6X6J6I6Q6X6E625]645V5a4F4L4w333v3H3[4z4V4{5b5R5/636a6l6!6^7p7K7<8d8s8*8C827}7{7U7u786/6$6H6r5;6R6V5Z5(5%5%4[4X4M4(4n3)3#2_2g1a0_273i3;4Y4!4]5v5g5R6k5;6z6x6L6%6+6y6p6o6f6c6o6n6a5@635Z514z3<3G2P2R333f404Z4=5y5B5G6d6C617h7t7z7n7*7_878a7>8689837U7t7e716$6H6v6H6h6l665^5.695k5k5e4W4G413X2)231t1m2j383p4g484Z4(515O5+6f6n6H6H6y6O6r6x606z6d606w6f5.5T5R5b4N3_3j2J2$2}3L3/4y56525d5@6g6x6w6&6.7y7j7Y7-7N7@7{7=7!7!7E7f7n786!6Z6z6Z6.6R6/6S6h5*5W5G5k4$4+483S2<2u150&1)2t2~3J4q4H4+4;5C5W6H6o6w6v6J6d645[5[6n5}61675[5^5%5t5u504r3>273M3Q4f4o4v4z4X5m6f6B6$6;6_7e7A7G7v7H7z7#7T887{7u7q7J7A7O6]6T6Q6]6.6U6W6K6L6f6f5u5N4{4~3@3m2-200^0<1C252T333S414*4=5q5K5[6w6k6j6m6a626d5.5-5(5]5+5Y5?5x5G5k4[4J4F2G3-494F504~4_595t5E5>6L6V6^717p6}7z7f7g7p7r7X7x7j7U7w7I6)6Q6$757h7i776(6#6x6B6w5)5b4=4O3Z302p1^0{0Q1G2p2R2=3A3*4M4=4~5[5!5]6a6j6I6h695@5I5z5J5&5Q5#5Z5F5S5W5j4J4G383Z4V6b5y5q5d5.5#5?5-6e6:6-6@6]6#6[7o6_787q7h796Z7b6>6Z6V6+706^7c7e767k6$71766n5<5o584o453u2:210/1c1U2F2&3e3G3^4B4(5h5L5X626c6i6m645.5Z5P5j4~5z5j5B5Q5R5!5X5F564_2]4v524^5m5d5N5P5)615[6d696!6+6$736S6W6@6(6;6<756V6J6{6x6x6V6=7s7z7r737p6]767j6B62595d4H3&3M2c1#12171{2}2{3I3_4G4N4?4@5o5M675@696e6b6d5S5r4}565d4<525l5-5P5*5z5g592X3O4M4N5F5+5O645-6h6!6Q6F6x6>6z6S6R6Q6Z6F6P686w6X6G5?6k6!6?7x787c7g7P7J756^6!6H5[5R4:4!3_3c261G0[0=1#2C2&3)4l4I4@5v5F5>5n5=5[5[5[6f5.5!5u4~4P4W4C4&4<5m5a5-5}5v5b3B3L414O5U6e5^6i6n6x6I6o6w6O6#6S6$6K6n6g6h5:626p615#5<7Q937k7d6_7A7B7K7V7k7d6(6v645M4}493M3p2H1/100/1R2q3C3Q4N4G4^5H5y5P5V6d645[5}5[5y5#5o4~4M48414u4U4%4<5o5w5w523[3.5L525(6y6y6o626J6R6K6/6:766_6s6n6z665_5s5C5V5o5s5-5)6O6I6%6[7s7U7p7z7A7j6)6J5?5V5a4z3+3z2}1=0]0]1n2J3s3V4r4+4#5e5y5J5?6c6e5>5Z5]5<5r5b4<4D3Y3/3%4g4N4Y4W4V4*4v3K454Z5F616i6d6i6b6&6J6T6=6(6&6S6E6n716h5#5)4_4Y4[515L5D5&6T6B7e7q7t7K7p7y716W6x6u5J4~4M3<3!2$1}0Y0F1:2z2_3_4E4Y5n5X5:5<5_6f5:675)5<5Q5s504Y4A3(3F3C3&3;494q4L4Y4P3O474}5H5r686J6x6x6:6L6#6Q6#6L6I6r6e6t6m5Z5[4+4O4R4W5i5G6&7}7}6~6(7e7l746(6/6Z6y5-5T5s4D4t3P2{1-1n0]1P2A364F4t4Y5l5t5Z5^6o6d635>5.5?5-5r5b4]453>302=393K3<3)493~424I5g5P5Q5W5*6N6T6#6$6O6J6G6C6s6c6r6n5@5+5#5E5g4e4a4P5d5Z666<7C6W6s6>6P6-6[6X6q6w6a5F4?4K4g3Z2!1?1y0I2b2>3]4%4s4>555T5:5&6b5;6m6t5^5~5L5t5f4;4B3+2W2F2&2/3O3F3A3Q3X5i5k5K5^5]6O6Z6w6[746w6#6H6x6x6x6i6c5_6c5A4]4T4v3]3~4Q4)5y5&656d6n6w6G6G6d6d625_5F4#4?4Q4k3$2{1]1m0!1Q2E353Y4t4H4?5G5E5-5@5]6l6y6d5*5G5t4F4u4n40302v1]2h2M2:2:363L5i5I5_6o5_6J6+6u6>6U6w6C6N6i685{6s6i5*5&5!5N4>493[3X4:4{5L5z5_615:5[6e6h5-5<5]5J5U5a4/4L423q2.1:1o0.1n282?3v3}4x4;5a5q5?5%66636a5@5$5Q5H4=4S4(4m3z2S2a1)1[202g2T3i5r636h6d6c6T6V6S6_6u6r6P6x6m625?5(5P5T5Y5Q5m4T4v3^3r4p53514_5v5P5T5!5-5@6w6>675N5t5w4~4p3)4q3520130&1H252^3g3(3/4A4^5v5F5G5$626e5Z5{5$5v4@4[4+4r3[362@2c1R1G1c1P1/5;5w5=6s6F6L6%7H6Q766O6f6l6d5-5O5N5E5q5!5o5b4>4K493s3+5g4P4V5;5L5O5M5M5X6c6}5)5m5p4~4D423J422B1U0]0q1n1k2o3B3z3C4h4U595v5Z5+5@605-5!5@5C5r4;4P4m4h3&3p2+241R160}156t6y6$656Z6?7675746Y6m6F5{6g5S5P5l5l5A5G4:514X4m3I2:3x4q3@5c5[6u6O5!5r5u5y5!5w4:4Y4~4u4D3#34241P0Z0f0Q1i252[2;3G3~4z4~5o5x5^5@6363605-5*5P5s5e4U4l3=3$3B2^2c1!0[0.6K6!6T6}6$767b756@6J6p666x5;5V5A5y5R5E4+4X4*4E453R2?3r3n3L4x4t535W5.656m68584:4:4C4D483:3b2]2p1B0-0b0_262S2U3a3Y3_4K4/5r5k5/6d5-6663645%5N5G5j4>4D3&3M3S3r2^2A1=116!6.6[726J6?7y7m6;6.6B5)5{5[5-5k5T4Y3(4j4O4P443E352q2&2$3b3l3-4m3[4F4P5m5C4R4R4/4E4j4h3S3L2X2o1u0+0k1q1>2$2?3s3#4h4N4?5v5G5T6362646e6l5-5H5v5i584W4q3&3<4j3R2X2f1Z7Y767o7t7l6r786;6S776U6x5}6a5)5J5t4-3.3?3+3!3s2S2K2t272P2V2-2=32393?474i4r4?4_4[4]4Q4v3t362>2k1D1a0k1x2a313l3u454M4>4}585D5O5@626d6C645>5<5I5t4?4Y4F4n493)3R2Z2x2H7V7f7W7y7r6}7o6@6Y6/6B6f646t5Z5c4?4s3Z3j3k2~2)2~2^2%2+2C2D2I2d282R2)392^4D4X4^4:4@4#4J3K362$1^1l0D0z1w282<3h3K424X4^5l5e5E5{5>5}646C6y625[5*5m514!4b4o3<3T3B2^2%2K7{7H7O7z7n6]7j6)6!6!6p5_5Q6p5r5b4=3(3v35322;3A3I3R3H32402;2.2z2t1[2p2a2)3y3^4b464*4A4z403c2T2e1O0N0N192i2u3R3&4i4p4Y5b5n5F5S6r6b6r6w6v5V615%5l4<4y4k3^3Q3r2&2:2h1R8y7H7X7J717s7e6]6R6h6h6G6d5v524+4L3C3d2]3V4t3%4C3}3^4a3+3!3L2Z2z2m1#1X1I1~2{3H3L493?483>3y2T2o1I0H0t242u2(3^3+4d4A4@5a5y5v5<6o6r6H6z5_5X5O5q5b4$4e3}3?3q2$2g1S1A0%8l8g7}857A7m6^6Y6@6F6A675R5i5y4f3J3(3?424p4c4g4&4Q4)5b5d534h3G3h2r2h1.1&1G2829363D3D3B3}2:2Y2l1L0T0N1t2d2m3O3P484D4N505h5H5I666y63675T5Z5X564+4U3_3N3J2T271W1e130J827_7T7#7Z6+6u6g5-6C685W5L5i4R3=384p4m4N4L4T4D4V4(535N635s4F3=3p3a302F1{1T1Q1/2f2Y313v2V2U2U1:1y0v0U1P2o2U383$3.4i4N4<5I5U5;5]6e645[5P5#5q4*4-413@2{2C1V251H1p1n1J8m857S7!7x7b6+6>5}6l5@5L4}4E4b3+464A4U4W4+52564]5l515Z5t4?4F4b403D322~2/2k271V1C1Y252s2i2d2I221k0/0Q1u2l2F2;3H3)454.5j515G5~5-5@5?5Q5R5h6o514s3;3l2p2n2u2J2F242e288e7.7{7b7m6}6<6m5L5r5d4L4h4c3(483(4O4)515b5l5F5P5v5G5N4@4<4%4o4n3Q3L3y3D2@2L1T1x1k14141v1S1^1]1h0O0K1e1:2y3c3h3S41434L4]5m5Y5[5-5#5r5d575.4_3[373a372@37313J2]362D7L7O7I7p7z7f6:5@5C4?4(4t4i463/5B4{5m5u5D5P5J5W5]5)5v5u5c4[544z4N493^3{3T3K2:2s1)1v0+0W0~1z1Q1q0~000M1c282q2~3a3V3=4w4_5o5E5Y5Y5%5m4_4+4S4-3{3W3b3B3r3S3/473&3I3s2:7{7:7X7I7w6]6E605-625d4?4C4+3!5x585v5U5-5@6d635.5_625K5I5i514<4Y4T4u3{3{3.3D3p2p2v1Z0?130/1f0O0g020T1H1>2y3k3_3.4h4s4)5x5m5Q5*5L5D4{514W4M4o4i4j3;4r4x3_46483(3B3h";
