// Load it all!
window.onload = function load() {
    var perspective = GLMathLib.perspective(65, 16.0/9.0, 0.3, 690);
    console.log(perspective);
    console.log(GLMathLib.flatten(perspective));
    var a = [
		1, 2, 3, 4,
		5, 6, 7, 8,
		9, 10, 11, 12,
		13, 14, 15, 16
	];
	var b = [
		0, 1, 1, 0,
		1, 0, 0, 2,
		3, 4, 5, 6,
		1, 2, 2, 1
	];
	console.log(GLMathLib.mult(b, a));
};
