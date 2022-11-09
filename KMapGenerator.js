/**
 * Karnaugh Map Generator.
 *
 * By Antonio García Díaz.
 *
 * Université Libre de Bruxelles 2016-2017.
 *
 * This module was created as a javascript web application to automatically generate K-Map exercices and their solutions.
 * It uses a method (pseudo-ESPRESSO) based on the ESPRESSO algorithm to calculate an optimal cover of the K-Map using n-cubes, and display the solution linked to said covering.
 * The application is meant to be used in conjunction with KarnaughMap.html, which provides an HTML layout to showcase the application.
 *
 * @module KMapGenerator
 */

//----------------------------------------------------------------------------------
//-------------------------INITIALISATION OF VARIABLES------------------------------
//----------------------------------------------------------------------------------

/**
 * A class meant to represent a Karnaugh Map (KMap) through a matrix (array of arrays).
 * It also contains information about an optimal cover of said map, which is dynamically calculated every time it is modified.
 *
 * In addition, the class possesses the methods and static properties needed to calculate such a cover, and display the K-Map as an interactive HTML interface.
 * The cover is calculated using a pseudo-ESPRESSO method (based on the ESPRESSO algorithm).
 *
 * @class KMap
 */


//----------------------------------------------------------------------------------
//-----------------------------CONSTANT PROPERTIES----------------------------------
//----------------------------------------------------------------------------------

/**
 * Names used for each possible variable.
 *
 * @property varNames
 * @type {Array}
 * @default ["A","B","C","D","E"]
 */
var varNames = new Array("A","B","C","D","E"); // Names used for each possible variable
/**
 * Number of "levels" of the K-Map for each numVar (KLvl[0] and KLvl[1] are unused).
 * There is only one level unless we use 5 variables. Then the K-Map becomes "3D", and there are two levels.
 *
 * @property KLvl
 * @type {Array}
 * @default [0,1,1,1,1,2]
 */
var KLvl = new Array(0,1,1,1,1,2);
/**
 * Width of the K-Map for each numVar (KWid[0] and KWid[1] are unused).
 *
 * @property KWid
 * @type {Array}
 * @default [0,2,2,4,4,4]
 */
var KWid  = new Array(0,2,2,4,4,4);
/**
 * Height of K-Map for each numVar (KHei[0] and KHei[1] are unused).
 *
 * @property KHei
 * @type {Array}
 * @default [0,1,2,2,4,4]
 */
var KHei = new Array(0,1,2,2,4,4);
/**
 * Number of variables written horizontally for each numVar.
 *
 * @property KVarX
 * @type {Array}
 * @default [0,1,1,2,2,2]
 */
var KVarX  = new Array(0,1,1,2,2,2);
/**
 * Number of variables written vertically for each numVar
 *
 * @property KVarY
 * @type {Array}
 * @default [0,0,1,1,2,2]
 */
var KVarY = new Array(0,0,1,1,2,2);
/**
 * The order of bits as represented in a K-Map (00, 01, 11, 10).
 *
 * @property bitOrd
 * @type {Array}
 * @default [0,1,3,2,4,5,7,6]
 */
var bitOrd = new Array(0,1,3,2,4,5,7,6);
/**
 * A string specifying the name of the "normal" color for spaces in the K-Map.
 *
 * @property normalColor
 * @type {String}
 * @default "white"
 */
var normalColor = "white";			// 0xFFFFFF;
/**
 * A string specifying the name of the color used for selected spaces in the K-Map.
 *
 * @property selectColor
 * @type {String}
 * @default "yellow"
 */
var selectColor = "yellow";			// 0xFFFF00;


//----------------------------------------------------------------------------------
//-----------------------------VARIABLE PROPERTIES----------------------------------
//----------------------------------------------------------------------------------


/**
 * The number of logic variables for the K-Map.
 *
 * @property numVar
 * @type {Integer}
 * @default 4
 */
var numVar = 4;
/**
 * Wether the K-Map may have "don't care" symbols or not.
 *
 * @property allowDC
 * @type {Boolean}
 * @default false
 */
var allowDC = false;
/**
 * The content of the K-Map itself, as an array of arrays.
 *
 * @property KMap
 * @type {Array}
 * @default []
 */
var KMap = [];
/**
 * The list of covered spaces in the K-Map, as an array of coordinates.
 *
 * @property coverList
 * @type {Array}
 * @default []
 */
var coverList = [];
/**
 * The list of n-cubes that form an optimal cover of the K-Map, as an array of arrays of coordinates.
 *
 * @property nCubeList
 * @type {Array}
 * @default []
 */
var nCubeList = [];


initKMap(numVar);


//----------------------------------------------------------------------------------
//---------------------SIMPLE FORMAT TRANSLATION FUNCTIONS--------------------------
//----------------------------------------------------------------------------------


/**
* From integers val and b, produces a string that expresses val as a b-bit binary value.
*
* @method toBinString
* @param val {Integer} The integer value to be converted to binary.
* @param b {Integer} The maximum number of binary bits to be retained in val.
* @return {String} Returns a string expressing val as a binary number of less than b bits.
*/
function toBinString (val, b){
    var str = val.toString(2);
    for (var i=0; i<b; i++){
        if (str.length<b) str = "0" + str;
    }
    if (b===0) str = "";
    return str;
}

/**
* From an integer (representing a boolean as a binary cypher, or a don't care as anything else),
* produces a corresponding string. Said string contains the same binary cypher if boolean,
* or "_" if don't care.
*
* @method boolToBin
* @param bool {Integer} A value that represents a boolean, or don't care.
* @return {String} Returns "1" if bool = 1 (true), "0" if bool = 0 (false), and "_" otherwise (don't care).
*/
function boolToBin (bool){
    if (bool === 1) return "1";
    else if (bool === 0) return "0";
    else return "-";
}


//----------------------------------------------------------------------------------
//-----------------------------THE ESPRESSO ALGORITHM-------------------------------
//----------------------------------------------------------------------------------


/**
* Checks wether a given n-cube can be accepted by the K-Map.
*
* An n-cube is accepted only if it contains no 0 values, and it contains at least one 1 value.
* Indeed, from the logic of favorising the largest possible n-cubes, it follows that a cube with
* no 0 values is accepted, even if most other values are "don't cares", as long as it has a single
* 1 value at least.
*
* @method checkCube
* @param coords {Array} An array containing the coordinates of the n-cube's first (top-left-front) space.
* @param sizes {Array} An array containing the dimensions of the n-cube (in spaces).
* @return {Bool} Wether the n-cube is accepted (contains no 0 values at least one 1 value).
*/
function checkCube(coords, sizes){
    var no0val = true; // Remains true until a 0 value is found (we stop searching then).
    var has1val = false; // Remains false until a 1 value is found.
    for (var d=coords[2]; d<sizes[2]+coords[2] && no0val; d++){
    for (var w=coords[0]; w<sizes[0]+coords[0] && no0val; w++){
    for (var h=coords[1]; h<sizes[1]+coords[1] && no0val; h++){
        no0val = no0val && KMap[d][w%KMap.Width][h%KMap.Height].Value;
        has1val = has1val || KMap[d][w%KMap.Width][h%KMap.Height].Value == 1;
    }}}
    return (no0val && has1val);
}


/**
* Checks wether a given n-cube can be accepted by the K-Map.
*
* An n-cube is accepted only if it contains no 0 values, and it contains at least one 1 value.
* Indeed, from the logic of favorising the largest possible n-cubes, it follows that a cube with
* no 0 values is accepted, even if most other values are "don't cares", as long as it has a single
* 1 value at least.
*
* @method makeCube
* @param coords {Array} An array containing the coordinates of the n-cube's first (top-left-front) space.
* @param sizes {Array} An array containing the dimensions of the n-cube (in spaces).
* @return {Array} An array of spaces representing the n-cube's portion of the K-Map.
*/
function makeCube(coords, sizes){
    var newCube = [];
    for (var d=coords[2]; d<sizes[2]+coords[2]; d++){
    for (var w=coords[0]; w<sizes[0]+coords[0]; w++){
    for (var h=coords[1]; h<sizes[1]+coords[1]; h++){
        newCube.push([w%KMap.Width,h%KMap.Height,d]);
    }}}
    return newCube;
}


/**
* Within an n-cube array, eliminates any n-cubes whose spaces are entirely covered by other n-cubes in the array.
*
* @method checkForCollisions
* @param nCubeArray {Array} An array of arrays, each representing the portion of the K-Map covered by an n-cube.
* @return {Array} Returns a new array containing the maximal n-cubes from the original, those that were not contained in another n-cube.
*/
function checkForCollisions(nCubeArray) {
	var newCubeArray = [];
    var toKeep = [];
    var contained = false;
    for (var i=0; i<nCubeArray.length; i++){
        contained = false;
        for (var j=0; j<nCubeArray.length; j++){
			if ( i!=j &&  nCubeArray[i].length < nCubeArray[j].length){
				contained = contained || isContainedIn(nCubeArray[i],nCubeArray[j]);
			}
            else if ( j<i && nCubeArray[i].length == nCubeArray[j].length ){
				contained = contained || isContainedIn(nCubeArray[i],nCubeArray[j]);
			}
		}
        if (!contained) {toKeep.push(i);}
    }
    for (var k=0; k<toKeep.length; k++){
        newCubeArray.push(nCubeArray[toKeep[k]]);
    }
    return newCubeArray;
}


/**
* Checks if an n-cube is contained in another. Returns true if nCube1 is contained in nCube2.
*
* This function  be used in a larger context, with nCube1 and nCube2 being any two lists of spaces from the K-Map (and not necessarily n-cubes).
* The usage is then the same, to check if one contains the other.
*
* @method isContainedIn
* @param nCube1 {Array} An array of spaces, usually representing an n-cube's portion of the K-Map.
* @param nCube2 {Array} Another array of spaces, usually representing another n-cube's portion of the K-Map.
* @return {Bool} Returns true if the spaces in nCube1 are part of the spaces in nCube2, false otherwise.
*/
function isContainedIn(nCube1,nCube2){
    var check = 0; var found = false;
    for (var i=0; i<nCube1.length; i++){
		found = false;
        for (var j=0; j<nCube2.length; j++){
            if(nCube1[i][0] == nCube2[j][0] && nCube1[i][1] == nCube2[j][1] && nCube1[i][2] == nCube2[j][2]){
                found = true;
            }
        }
		if(found){check += 1;}
    }
    return (check == nCube1.length);
}


/**
* Returns true if a given space can already be found in a given list of (covered) spaces.
* Used to test wether a space that is detected as covered has been already added to the "covered spaces" list or not.
*
* @method alreadyCovered
* @param space {Array} The coordinates of a space in the K-Map, that has been detected as covered.
* @param cover {Array} An array of space coordinates. Usually the list of covered spaces, still being built.
* @return {Bool} Wether the space is already in the list of covered spaces or not.
*/
function alreadyCovered(space, cover){
    var covered = false;
    for (var i=0; i<cover.length; i++){
        if(space[0] == cover[i][0] && space[1] == cover[i][1] && space[2] == cover[i][2]) covered = true;
    }
    return covered;
}


/**
* Generates a list of covered spaces in the K-Map from a list of n-cubes (representing a cover of said map).
*
* @method getCoverList
* @param nCubeArray {Array} An array of arrays, each representing an n-cube's portion of the K-Map.
* @return {Array} An array representing a cover of the K-Map, containing the coordinates of covered spaces.
*/
function getCoverList(nCubeArray){
    cover = [];
    for (var i=0; i<nCubeArray.length; i++){
        for (var j=0; j<nCubeArray[i].length; j++){
            if(!alreadyCovered(nCubeArray[i][j], cover)) cover.push(nCubeArray[i][j]);
    }}
    return cover;
}


/**
* Checks if a list of covered spaces contains all of the 1 values in the K-Map.
*
* @method coversAll1
* @param cover {Array} An array of spaces in the K-Map.
* @return {Bool} Returns false if at least one 1 value falls outside the array of spaces, true otherwise.
*/
function coversAll1(cover){
    var check = true;
    for (var d=0; d<KMap.nLevels; d++){
    for (var w=0; w<KMap.Width; w++){
    for (var h=0; h<KMap.Height; h++){
        if(KMap[d][w][h].Value == 1 && !alreadyCovered([w,h,d], cover)) check = false;
    }}}
    return check;
}


/**
* The "expand" step of the pseudo-ESPRESSO algorithm.
*
* Each new n-cube is expanded towards every direction (width, height, and square) until it cannot be expanded anymore,
* creating various candidate "expanded" n-cubes. These cubes are then added to the n-cube list.
* Finally, if any expanded n-cubes is contained within another expanded cube, it is removed from the list.
*
* In the 5-variable case, n-cubes that cover both levels of depth (E and notE), are treated separately from other cubes,
* although using the same tree-choice layout for their expansion. This is because, by using that choice layout, it is possible
* to find a 1-1 association of every case of 1-level-deep cube with a distinct case of 2-levels-deep cube.
*
* @method EspressoExpand
*/
function EspressoExpand() {
	var newCubeSet = []; // All of the expanded n-cubes created from a single space, regardless of wether some cubes contain others.

    var w = 0; var h = 0; var d = 0;

	while(d<KMap.nLevels){
        // For 1-level deep n-cubes (cover either E or notE in the 5 variable case).
        while(h<KMap.Height){
            while(w<KMap.Width){
				newCubeSet = [];

	            if( checkCube([w,h,d], [1,1,1]) ) newCubeSet.push(makeCube([w,h,d], [1,1,1]));

				//Expanding for n-cubes oriented along the width.
                if( checkCube([w,h,d], [2,1,1]) ) newCubeSet.push(makeCube([w,h,d], [2,1,1]));
                //In case a cube takes the whole width.
                if( KMap.Width==4 && w===0 ){
                    if( checkCube([w,h,d], [4,1,1]) ) newCubeSet.push(makeCube([w,h,d], [4,1,1]));
                    if( checkCube([w,h,d], [4,2,1]) ) newCubeSet.push(makeCube([w,h,d], [4,2,1]));
                }
                newCubeSet = checkForCollisions(newCubeSet);

                //Expanding for n-cubes oriented along the height.
                if( checkCube([w,h,d], [1,2,1]) ) newCubeSet.push(makeCube([w,h,d], [1,2,1]));
                //In case a cube takes the whole height.
                if( KMap.Height==4 && h===0 ){
                    if( checkCube([w,h,d], [1,4,1]) ) newCubeSet.push(makeCube([w,h,d], [1,4,1]));
                    if( checkCube([w,h,d], [2,4,1]) ) newCubeSet.push(makeCube([w,h,d], [2,4,1]));
                }
                newCubeSet = checkForCollisions(newCubeSet);

                //Expanding for square n-cubes.
                if( checkCube([w,h,d], [2,2,1]) ) newCubeSet.push(makeCube([w,h,d], [2,2,1]));
                //In case a cube takes the whole width and height.
				if( w===0 && h===0 && KMap.Width==4 && KMap.Height==4){
                    if( checkCube([w,h,d], [4,4,1]) ) newCubeSet.push(makeCube([w,h,d], [4,4,1]));
                }
                newCubeSet = checkForCollisions(newCubeSet);

	            for (var i=0; i<newCubeSet.length; i++){ nCubeList.push(newCubeSet[i]); }
	            w += 1;
	        }
	        w = 0; h += 1;
		}
		w = 0; h = 0;

        // For 2-levels deep n-cubes (cover E AND notE in the 5 variable case).
        if(d===0 && KMap.nLevels==2){
            while(h<KMap.Height){
                while(w<KMap.Width){
                    newCubeSet = [];

                    if( checkCube([w,h,d], [1,1,2]) ) newCubeSet.push(makeCube([w,h,d], [1,1,2]));

                    //Expanding for n-cubes oriented along the width.
                    if( checkCube([w,h,d], [2,1,2]) ) newCubeSet.push(makeCube([w,h,d], [2,1,2]));
                    //In case a cube takes the whole width.
                    if( KMap.Width==4 && w===0 ){
                        if( checkCube([w,h,d], [4,1,2]) ) newCubeSet.push(makeCube([w,h,d], [4,1,2]));
                        if( checkCube([w,h,d], [4,2,2]) ) newCubeSet.push(makeCube([w,h,d], [4,2,2]));
                    }
                    newCubeSet = checkForCollisions(newCubeSet);

                    //Expanding for n-cubes oriented along the height.
                    if( checkCube([w,h,d], [1,2,2]) ) newCubeSet.push(makeCube([w,h,d], [1,2,2]));
                    //In case a cube takes the whole height.
                    if( KMap.Width==4 && w===0 ){
                        if( checkCube([w,h,d], [1,4,2]) ) newCubeSet.push(makeCube([w,h,d], [1,4,2]));
                        if( checkCube([w,h,d], [2,4,2]) ) newCubeSet.push(makeCube([w,h,d], [2,4,2]));
                    }
                    newCubeSet = checkForCollisions(newCubeSet);

                    //Expanding for square n-cubes.
                    if( checkCube([w,h,d], [2,2,2]) ) newCubeSet.push(makeCube([w,h,d], [2,2,2]));
                    //In case a cube takes the whole width and height.
                    if( w===0 && h===0 && KMap.Width==4 && KMap.Height==4){
                        if( checkCube([w,h,d], [4,4,2]) ) newCubeSet.push(makeCube([w,h,d], [4,4,2]));
                    }
                    newCubeSet = checkForCollisions(newCubeSet);

                    for (var j=0; j<newCubeSet.length; j++){ nCubeList.push(newCubeSet[j]); }
                    w += 1;
                }
                w = 0; h += 1;
            }
            w = 0; h = 0;
        }
        w = 0; h = 0; d +=1;
    }
    nCubeList = checkForCollisions(nCubeList);
}


/**
* The "irredundant cover" step of the pseudo-ESPRESSO algorithm.
*
* The number of n-cubes in the cover is reduced to a minimum, eliminating any redundant cubes.
* This is achieved by itterating over the list of n-cubes until no more cubes can be removed.
*
* Each cube is first temporally eliminated from the list, to check if the previous cover (with the cube)
* is contained in the new one (without the cube).
* Since the opposite is always true, this would mean that the covers are identical.
*
* In case the covers are in fact not identical, and if "don't care" values are possible,
* it is instead checked wether all of the spaces with a 1 value are covered by the new cover.
*
* If any of these conditions apply, the n-cube is considered redundant and definitively removed from the list.
* Otherwise, if the covers are not identical (and if 1 values are left out), the n-cube is considered essential
* and is retained in the list.
*
* @method EspressoIrredundantCover
*/
function EspressoIrredundantCover() {
    coverList = getCoverList(nCubeList);
    var lastIter = false;
    var newNCubeList = [];
    var newCover = [];
    while(lastIter === false){
        //If the previous itteration didn't remove any n-cubes, it becomes the last iteration and the algorithm stops.
        lastIter = true;
        for (var i=0; i<nCubeList.length; i++){
            //We itterate from the first n-cube on the list onwards. That is, from the top-left corner.
            newNCubeList = JSON.parse(JSON.stringify(nCubeList));
            newNCubeList.splice(i, 1);
            newCover = getCoverList(newNCubeList);
            //We check if the old cover is contained in the new one, to see if they are the same (the new one is always contained in the old one).
            if( isContainedIn(coverList,newCover) ){
                nCubeList = newNCubeList; coverList = newCover;
                lastIter = false;
            }
            //Alternatively, in the "don't care" case, we check if all the 1 values are still contained within the cover.
            else if (allowDC && coversAll1(newCover)) {
                nCubeList = newNCubeList; coverList = newCover;
                lastIter = false;
            }
        }
    }
}



/**
* Starts the pseudo-ESPRESSO algorithm for the current state of the K-Map.
*
* Resets the lists of n-cubes and of covered spaces, and calls the functions for each step of the algorithm.
*
* @method EspressoSolve
*/
function EspressoSolve() {
	nCubeList = [];
	coverList = [];
    EspressoExpand();
    EspressoIrredundantCover();
}


//----------------------------------------------------------------------------------
//-------------------FUNCTIONS FOR CREATING AND MANAGING K-MAPS---------------------
//----------------------------------------------------------------------------------

/**
 * Resets and rebuilds the KMap matrix and its attributes, with a given number of logic variables.
 *
 * @method initKMap
 * @param nVar {Integer} The number of variables for the map.
 */
function initKMap (nVar){
    KMap = [];
    KMap.nLevels = KLvl[nVar];
    KMap.Width = KWid[nVar];
    KMap.Height = KHei[nVar];
    KMap.nVarX = KVarX[nVar];
    KMap.nVarY = KVarY[nVar];
    for (var d=0; d<KMap.nLevels; d++){
        KMap[d] = [];
        for (var w=0; w<KMap.Width; w++){
    		KMap[d][w] = [];
    		for (var h=0; h<KMap.Height; h++){
    			KMap[d][w][h] = [];
    			KMap[d][w][h].Value = 0; // False is default
    			valueStr = toBinString(bitOrd[d],KMap.nLevels-1) + toBinString(bitOrd[w],KMap.nVarX) + toBinString(bitOrd[h],KMap.nVarY);
    			value = parseInt(valueStr,2);

    			KMap[d][w][h].Button_id = "KM" + valueStr;
    			KMap[d][w][h].TD_id = "TD" + valueStr;
    	}}
    }
}


/**
* Simply resets and redraws the K-Map, using the current number of variables.
*
* @method resetKMap
*/
function resetKMap(){
    initKMap(numVar); redraw();
}


/**
* Changes the number of variables of the K-Map, resetting it in the process.
*
* @method changeNumVar
* @param Num {Integer} The new number of variables for the map.
*/
function changeNumVar(Num){
    if(Num != numVar){
        numVar = Num; initKMap(Num);
        document.getElementById("Var2").checked = (Num==2)?true:false;
        document.getElementById("Var3").checked = (Num==3)?true:false;
        document.getElementById("Var4").checked = (Num==4)?true:false;
        document.getElementById("Var5").checked = (Num==5)?true:false;
    }
    redraw();
}


/**
* Switches wether the K-Map allows for "don't care" symbols or not, resetting it in the process.
*
* @method switchDontCare
*/
function switchDontCare(){
    allowDC = !allowDC;
    for (var d=0; d<KMap.nLevels; d++){
    for (var w=0; w<KMap.Width; w++){
    for (var h=0; h<KMap.Height; h++){
        if(KMap[d][w][h].Value === 2) KMap[d][w][h].Value = 0;
    }}}
    redraw();
}


/**
* Modifies an entry in the K-Map, switching its value attribute (an integer)
* between 0 (false), 1 (true), and 2 (don't care).
*
* @method modifyKMEntry
* @param entry {Variable} A reference to an entry of the K-Map.
*/
function modifyKMEntry(entry){
    if (entry.Value === 0) entry.Value = 1;
    else if (entry.Value === 1 && allowDC) entry.Value = 2;
    else entry.Value = 0;
    redraw();
}

// *****************************************************THIS IS THE MAIN THING***************************************************************************************************************
//----------------------------------------------------------------------------------
//----------------------FUNCTIONS FOR THE AESTHETICS OF THE GUI---------------------
//----------------------------------------------------------------------------------


/**
 * Sets the color for each space in the K-Map's HTML representation back to its normal value.
 *
 * @method setAllToNormalColor
 */
function setAllToNormalColor(){
    for (d=0; d<KMap.nLevels; d++){
        for (h=0; h<KMap.Height; h++){
            for (w=0; w<KMap.Width; w++){
                    document.getElementById(KMap[d][w][h].Button_id).style.backgroundColor = normalColor;
    }}}
}


/**
 * Sets the color of a group of spaces in the K-Map's HTML representation to a given color.
 *
 * @method setColor
 * @param nCube {Array} An array of coordinates corresponding to spaces in the K-Map, usually an n-cube.
 * @param color {String} A string specifying the color that the set of spaces will take.
 */
function setColor(nCube,color){
    for(var i=0; i<nCube.length; i++){
        document.getElementById(KMap[nCube[i][2]][nCube[i][0]][nCube[i][1]].Button_id).style.backgroundColor = color;
    }
}

/**
 * Redraws the HTML display of the KMap and its solution.
 *
 * @method redraw
 */
function redraw(){
    document.getElementById("KMapMaker");
    document.getElementById("KMapDiv").innerHTML = generateKMapHTML();
    document.getElementById("SolutionDiv").innerHTML = generateSolutionHTML();
    document.getElementById("LaTeXCode").value = generateLaTeXCode();
}


/**
 * Generates a new HTML code for the K-Map. The map is displayed as a matrix of clickable buttons.
 *
 * @method generateKMapHTML
 * @return {String} The new HTML code for the K-Map.
 */
 function generateKMapHTML() {
     var text = "<center></center>";
     text += "\n<center></center>";
     text += "<center><small>An exportable LaTeX code for the current K-Map <a href='#LaTeX'>is available below</a>.</small></center><br /><center>";
     var h,w,d; //Using a 3D table helps to account for 5 variables;


     //text += "<table border=1>";
     text += "<table>";

 	//Width of the matrix
 	text += "<tr><th></th><th></th><th colspan="+KMap.Width*KMap.Height+2+">";
 	for (var i=0; i<KMap.nVarX+KMap.nLevels-1; i++){
 		text += varNames[i];
 	}

 	text += "</th></tr>";
 	text += "<tr>";
 	text += "<th></th><th></th><th></th>";
    for (d=0; d<KMap.nLevels; d++){
 	for (w=0; w<KMap.Width; w++){
        if (w===0 && d==1) text += "<th style='width:1mm'></th>";
 		text += "<th>"+toBinString(bitOrd[d*4+w],KMap.nVarX+KMap.nLevels-1)+"</th>";
    }}
 	text+="</tr>";

 	//Height of the matrix
 	for (h=0; h<KMap.Height; h++){
 		text = text + "<tr>";
 		if (h===0){
            text += "<th rowspan="+KMap.Height+">";
 			for (var j=0; j<KMap.nVarY; j++){
 				text += varNames[j+KMap.nVarX+KMap.nLevels-1];
 			}
            text += "<th rowspan="+KMap.Height+">";
 		}
 		text += "<th>"+toBinString (bitOrd[h],KMap.nVarY)+"</th>";

 		//Filling the matrix with buttons
        for (d=0; d<KMap.nLevels; d++){
 		for (w=0; w<KMap.Width; w++){
            if (w===0 && d==1) text += "<th style='width:1mm'></th>";
 			text += "<td  ID='"+KMap[d][w][h].TFD_id+"'; style='background-color:0xFF'>";
 			text += "<input ID="+KMap[d][w][h].Button_id +" name="+KMap[d][w][h].Button_id;
            text += " type='button'  style='height:6mm;width:8mm' value=' "+ boolToBin(KMap[d][w][h].Value);
            text += " '; onClick=modifyKMEntry(KMap["+d+"]["+w+"]["+h+"]);></td>";
 		}}
 		text += "</tr>";
 	}
    text += "</table>";
 	text+="</center></td></tr>";

 	return text;
}


/**
* Returns, for a given n-cube, its corresponding term in the cover's logic function (HTML version).
* Uses the binary strings related to each space covered by the n-cube, and compares them,
* to know which logic variables are concerned, and in which state they are accepted.
*
* If the mouse is hovered on the term, its corresponding n-cube will light up on the K-Map.
*
* @method getFunctionHTML
* @param nCube {Array} An array representing an n-cube's portion of the K-Map.
* @param cubeId {Integer} The place of the n-cube in the list of cubes, used to generate interactive HTML code.
* @return {String} A string representing a term in the logic function, related to the n-cube.
*/
function getFunctionHTML(nCube, cubeId){
	var ref = toBinString(bitOrd[nCube[0][2]],KMap.nLevels-1) + toBinString(bitOrd[nCube[0][0]],KMap.nVarX) + toBinString(bitOrd[nCube[0][1]],KMap.nVarY);
	var logicFunct = [];
	for(var x=0; x<ref.length; x++) logicFunct[x] = parseInt(ref[x]);
	//N-cubes containing just one space will have a term given by a single binary string.
	//The term from the first space is thus stored in logicFunct.
	if (nCube.length >= 2){
		//If the n-cube in fact covers more than one space, we compare the binary strings of new spaces with logicFunct.
		//Whenever in those strings we find a bit that differs from the correspondent one in logicFunct, it is overwritten with a "2".
		for (var i=1; i<nCube.length; i++){
			ref = toBinString(bitOrd[nCube[i][2]],KMap.nLevels-1) + toBinString(bitOrd[nCube[i][0]],KMap.nVarX) + toBinString(bitOrd[nCube[i][1]],KMap.nVarY);
			for (var j=0; j<ref.length; j++){
				if (logicFunct[j] != parseInt(ref[j])) logicFunct[j] = 2;
		}}
	}
	//From the final version of logicFunct, we build the expression of the term with letters.
	//If the bit corresponding to a logic variable A is 0, we write notA. If it is 1, we write A.
	//If it is 2, we don't write anything (meaning we don't care about the variable A).
	var funct = "<span ID=" + cubeId;
    funct += " onMouseOver='setColor(nCubeList["+cubeId+"],selectColor);'";
    funct += " onMouseOut='setColor(nCubeList["+cubeId+"],normalColor);'>";
    var wholeMap = true;
	for (var k=0; k<logicFunct.length; k++){
		if (logicFunct[k] === 0){
			wholeMap = false;
			funct += "<span style='text-decoration: overline'>" + varNames[k] + "</span>";
		}
		else if (logicFunct[k] == 1){
			wholeMap = false;
			funct += varNames[k];
		}
	}
	if (wholeMap) funct += "1";
    else funct += "</span>";
	return funct;
}


/**
* Generates a new HTML code for the K-Map's solution (a logic function that expresses its cover by the n-cubes).
*
* @method generateSolutionHTML
* @return {String} The new HTML code to show the cover's logic function.
*/
function generateSolutionHTML(){
    setAllToNormalColor(); //Before anything, we set the K-Map's overal color to its normal, non-selected state.
    EspressoSolve();
    var text = "<h4><center>K-Map cover function:</center></h4>";
    text+="<h2><center>F(";
    for (var x=0; x<(KMap.nVarX+KMap.nVarY+KMap.nLevels-1); x++){
        text += varNames[x]; if(x!=(KMap.nVarX+KMap.nVarY+KMap.nLevels-2)) text += ",";
    }
    text+=") = ";
    if (nCubeList.length === 0){ text += "0"; } //Case where no spaces are covered.
    else{ for (var i=0; i<nCubeList.length; i++){
        text += getFunctionHTML(nCubeList[i], i);
        if (i<nCubeList.length-1) text += " + ";
        //Code used for testing purposes, to express the cover as a list of n-cubes, rather than a function.
        /*
        text+="<li>n-cube #" + i + " : ";
        for(var j=0; j<nCubeList[i].length; j++){
            text +="(" + toBinString (bitOrd[nCubeList[i][j][0]],KMap.nVarX);
            text += toBinString (bitOrd[nCubeList[i][j][1]],KMap.nVarY) + ") ";
        }
        text+="</li>\n";
        */
    }}
    text+="</center></h2>";
    text+="<center><small>PROTIP: Hover the mouse over each term in the equation to lighten up the corresponding n-cube.</small></center>";

    return text;
}


//----------------------------------------------------------------------------------
//-----------------------FUNCTIONS FOR PRODUCING THE LATEX CODE---------------------
//----------------------------------------------------------------------------------

/**
 * Writes a string of LaTeX code to use as the document's header.
 * This sets the proper LaTeX configuration to display the K-Map.
 *
 * @method writeDocHeader
 * @return {String} The LaTeX code for displaying the n-cubes.
 */
function writeDocHeader(){
    var code = "\\documentclass[a4paper,10pt]{ltxdoc}\n";
    code += "\\usepackage[a4paper]{geometry}\n\n";
    code += "\\usepackage[scaled=0.92]{helvet}\n";
    code += "\\usepackage{sansmath}\n";
    code += "\\usepackage{color}\n";
    code += "\\usepackage{float}\n";
    code += "\\usepackage{listings}\n";
    code += "\\usepackage{array}\n\n";
    code += "\\usepackage{askmaps}\n\n";

    code += "\\definecolor{red}{rgb}{1,0,0}\n";
    code += "\\definecolor{green}{rgb}{0,1,0}\n";
    code += "\\definecolor{blue}{rgb}{0,0,1}\n";
    code += "\\definecolor{darkred}{rgb}{0.5,0,0}\n";
    code += "\\definecolor{darkgreen}{rgb}{0,0.5,0}\n";
    code += "\\definecolor{darkblue}{rgb}{0,0,0.5}\n";
    code += "\\definecolor{yellow}{rgb}{1,1,0}\n";
    code += "\\definecolor{cyan}{rgb}{0,1,1}\n";
    code += "\\definecolor{magenta}{rgb}{1,0,1}\n";
    code += "\\definecolor{gray}{rgb}{0.5,0.5,0.5}\n";
    code += "\\definecolor{orange}{rgb}{1,0.5,0}\n";
    code += "\\definecolor{aqua}{rgb}{0,1,0.5}\n";
    code += "\\definecolor{purple}{rgb}{0.5,0,1}\n";
    code += "\\definecolor{fuschia}{rgb}{1,0,0.5}\n";
    code += "\\definecolor{lime}{rgb}{0.5,1,0}\n";
    code += "\\definecolor{azur}{rgb}{0,0.5,1}\n";

    return code;
}


/**
* Returns, for a given n-cube, its corresponding term in the cover's logic function (text version).
* Uses the binary strings related to each space covered by the n-cube, and compares them,
* to know which logic variables are concerned, and in which state they are accepted.
*
* @method getFunctionText
* @param nCube {Array} An array representing an n-cube's portion of the K-Map.
* @param cubeId {Integer} The place of the n-cube in the list of cubes, used to generate interactive HTML code.
* @return {String} A string representing a term in the logic function, related to the n-cube.
*/
function getFunctionText(nCube, cubeId){
    var ref = toBinString(bitOrd[nCube[0][2]],KMap.nLevels-1) + toBinString(bitOrd[nCube[0][0]],KMap.nVarX) + toBinString(bitOrd[nCube[0][1]],KMap.nVarY);
	var logicFunct = [];
    for(var x=0; x<ref.length; x++) logicFunct[x] = parseInt(ref[x]);
    if (nCube.length >= 2){
        for (var i=1; i<nCube.length; i++){
			ref = toBinString(bitOrd[nCube[i][2]],KMap.nLevels-1) + toBinString(bitOrd[nCube[i][0]],KMap.nVarX) + toBinString(bitOrd[nCube[i][1]],KMap.nVarY);
			for (var j=0; j<ref.length; j++){
				if (logicFunct[j] != parseInt(ref[j])) logicFunct[j] = 2;
	}}}

    var funct = ""; var wholeMap = true;
	for (var k=0; k<logicFunct.length; k++){
		if (logicFunct[k] === 0){
			wholeMap = false; funct += "\\overline{" + varNames[k] + "}";
		}
        else if (logicFunct[k] == 1){
			wholeMap = false; funct += varNames[k];
		}
	}
	if (wholeMap) funct += "1";
	return funct;
}


/**
* Writes the K-Map's solution (a logic function that expresses its cover by the n-cubes) as a string of text.
*
* @method writeLogicFunction
* @return {String} The cover's logic function as a string of text.
*/
function writeLogicFunction(){
    var text = "F(";
    for (var x=0; x<(KMap.nVarX+KMap.nVarY+KMap.nLevels-1); x++){
        text += varNames[x]; if(x!=(KMap.nVarX+KMap.nVarY+KMap.nLevels-2)) text += ",";
    }
    text+=")=";
    if (nCubeList.length === 0){ text += "0"; } //Case where no spaces are covered.
    else{ for (var i=0; i<nCubeList.length; i++){
        text += getFunctionText(nCubeList[i], i);
        if (i<nCubeList.length-1) text += "+";
    }}
    return text;
}


/**
 * Finds, for an n-cube, the lowest or highest value for a space's for width, length, or depth, depending on the parameters.
 *
 * @method findExCoord
 * @param nCube {Array} An array of spaces, representing an n-cube's portion of the K-Map.
 * @param ex {Integer} The kind of extreme requested. Set to 0 for lowest, 1 for highest.
 * @param coord {Integer} The kind of coordinate. Set to 0 for width, 1 for height, 2 for depth.
 * @return {Integer} The lowest or highest such coordinate found in in the the n-cube.
 */
function findExCoord(nCube,ex,coord){
    var size;
    switch(ex){
        case 0: size = 4; break;
        case 1: size = 0; break;
    }
    for (var i=0; i<nCube.length; i++){ switch(ex){
            case 0: if (size > nCube[i][coord]) size = nCube[i][coord]; break;
            case 1: if (size < nCube[i][coord]) size = nCube[i][coord]; break;
    }}
    return size;
}


/**
 * Writes a string of LaTeX code to display the n-cubes in the K-Map.
 *
 * @method writeNCubes
 * @return {String} The LaTeX code for displaying the n-cubes.
 */
function writeNCubes(){
    var colors = ["red","green","blue","yellow","cyan","magenta","darkred","darkgreen","darkblue","gray","orange","fuschia","azur","purple","aqua","lime"];
    var code = "\n";
    var goesOutW; //If the n-cube goes out of the K-Map and back in, widthwise.
    var goesOutH; //If the n-cube goes out of the K-Map and back in, heightwise.
    if (nCubeList.length !== 0){ for (var i=0; i<nCubeList.length; i++){
        goesOutW = (nCubeList[i][0][0]==3 && findExCoord(nCubeList[i],0,0)===0);
        goesOutH = (nCubeList[i][0][1]==3 && findExCoord(nCubeList[i],0,1)===0);
        for(var d=0; d<2; d++){ if (findExCoord(nCubeList[i],d,2)==d){
            //For each depth level of the n-cube, if it exists.
            code += "\\color{" + colors[i%16] + "}";
            code += "\\put("+(4*d+nCubeList[i][0][0])+","+(KMap.Height-1-findExCoord(nCubeList[i],1,1))+".1)";
            if(goesOutW && goesOutH){
                code += "{\\dashbox{0.2}(0.8,0.8){}}\n";
                code += "\\color{" + colors[i%16] + "}\\put("+(4*d)+",0.1){\\dashbox{0.2}(0.8,0.8){}}\n";
                code += "\\color{" + colors[i%16] + "}\\put("+(4*d+3)+",3.1){\\dashbox{0.2}(0.8,0.8){}}\n";
                code += "\\color{" + colors[i%16] + "}\\put("+(4*d)+",3.1){\\dashbox{0.2}(0.8,0.8){}}\n";
            }else if(goesOutW){
                code += "{\\dashbox{0.2}(0.8,"+(findExCoord(nCubeList[i],1,1)-findExCoord(nCubeList[i],0,1))+".8){}}\n";
                code += "\\color{" + colors[i%16] + "}\\put("+(4*d)+","+(3-findExCoord(nCubeList[i],1,1))+".1)";
                code += "{\\dashbox{0.2}(0.8,"+(findExCoord(nCubeList[i],1,1)-findExCoord(nCubeList[i],0,1))+".8){}}\n";
            }else if(goesOutH){
                code += "{\\dashbox{0.2}("+(findExCoord(nCubeList[i],1,0)-findExCoord(nCubeList[i],0,0))+".8,0.8){}}\n";
                code += "\\color{" + colors[i%16] + "}\\put("+(4*d+nCubeList[i][0][0])+",3.1)";
                code += "{\\dashbox{0.2}("+(findExCoord(nCubeList[i],1,0)-findExCoord(nCubeList[i],0,0))+".8,0.8){}}\n";
            }else{
                code += "{\\dashbox{0.2}("+(findExCoord(nCubeList[i],1,0)-findExCoord(nCubeList[i],0,0))+".8,";
                code += (findExCoord(nCubeList[i],1,1)-findExCoord(nCubeList[i],0,1))+".8){}}\n";
            }
        }}
    }}
    return code;
}


/**
 * Generates a LaTeX document containing a representation of the K-Map.
 *
 * @method generateLaTeXCode
 * @return {String} The LaTeX code that represents the K-Map.
 */
function generateLaTeXCode(){
    var code = "{\\fontfamily{phv}\\selectfont\\sansmath\n";
    code += "\\askmap";

    //Number of variables.
    switch(numVar){
        case 2: code += "ii"; break;
        case 3: code += "iii"; break;
        case 4: code += "iv"; break;
        case 5: code += "v"; break;
    }
    code += "{$";

    //Solution (logic function).
    code += writeLogicFunction();
    code += "$}{";

    //Variable names.
    for (var x=0; x<(KMap.nVarX+KMap.nVarY+KMap.nLevels-1); x++) code += varNames[x];
    code += "}{}{";

    //Content of the K-Map.
    for (d=0; d<KMap.nLevels; d++){
    for (w=0; w<KMap.Width; w++){
    for (h=0; h<KMap.Height; h++){
    	code += boolToBin(KMap[bitOrd[d]][bitOrd[w]][bitOrd[h]].Value);
    }}}
    code += "}{";

    code += writeNCubes();
    code += "}}\n\n";
	return code;
}
