// Copyright Brandon Ly 2015 all rights reserved.

// Settings object that controls the properties of the canvas and renderer.

var Camera =
{
    at : GLMathLib.vec3(0.0, 0.0, 0.0),
    eye : GLMathLib.vec3(0.0, 0.0, 5.0),
    up : GLMathLib.vec3(0.0, 1.0, 0.0),
};

var Settings =
{
	yFOV: 65.0,
	aspectRatio: 16.0 / 9.0,
	nearClipPlane: 0.03,
	farClipPlane: 1000.0,
};
