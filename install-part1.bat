@echo off
echo Requirements: Anaconda with Python 3.6, CUDA 9.0, cuDNN for CUDA 9.0
echo Make sure Anaconda, CUDA, and cuDNN are in your PATH variable
echo Setting up Anaconda environment
conda create -n tensorflow python=3.5 numpy scipy matplotlib spyder
echo Installing/updating tensorflow and tensorflow-gpu
activate tensorflow
