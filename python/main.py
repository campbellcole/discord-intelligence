from __future__ import print_function
import matplotlib.pyplot as plt
import numpy as np
import time
import csv
import os
import asyncio
import sys
from keras.models import Sequential, load_model
from keras.layers.core import Dense, Activation, Dropout
from keras.layers.recurrent import LSTM, SimpleRNN
from keras.layers.wrappers import TimeDistributed
import argparse
from RNN_utils import *
import warnings
warnings.filterwarnings('ignore')

print("arguments: "+"\n".join(sys.argv));
# Parsing arguments for Network definition
ap = argparse.ArgumentParser()
ap.add_argument('--data_dir', default="./data/test.txt")
ap.add_argument('--alphabet_dir', default='./data/alphabet.txt')
ap.add_argument('--batch_size', type=int, default=50)
ap.add_argument('--layer_num', type=int, default=2)
ap.add_argument('--seq_length', type=int, default=50)
ap.add_argument('--hidden_dim', type=int, default=500)
ap.add_argument('--generate_length', type=int, default=500)
ap.add_argument('--nb_epoch', type=int, default=20)
ap.add_argument('--mode', default='train')
ap.add_argument('--model', default=os.getcwd() + '\\checkpoint.hdf5')
ap.add_argument('--retrain', type=bool, default=False)
ap.add_argument('--epochs', type=int, default=50)
args = vars(ap.parse_args())

DATA_DIR = args['data_dir']
ALPHABET_DIR = args['alphabet_dir']
BATCH_SIZE = args['batch_size']
HIDDEN_DIM = args['hidden_dim']
SEQ_LENGTH = args['seq_length']
MODEL = args['model']

GENERATE_LENGTH = args['generate_length']
LAYER_NUM = args['layer_num']

RETRAIN = args['retrain']

EPOCHS = args['epochs']

X, y, VOCAB_SIZE, ix_to_char, chars = load_data(DATA_DIR, ALPHABET_DIR, SEQ_LENGTH)

if not MODEL == '' and not RETRAIN:
  model = load_model(MODEL)
  print('model loaded\n')
else:
  model = Sequential()
  model.add(LSTM(HIDDEN_DIM, input_shape=(None, VOCAB_SIZE), return_sequences=True))
  for i in range(LAYER_NUM - 1):
    model.add(LSTM(HIDDEN_DIM, return_sequences=True))
  model.add(TimeDistributed(Dense(VOCAB_SIZE)))
  model.add(Activation('softmax'))
  model.compile(loss="categorical_crossentropy", optimizer="rmsprop")

nb_epoch = 0 # this means nothing now because i'm not saving the epoch number

# Training if there is no trained weights specified
if args['mode'] == 'train':
    if (RETRAIN):
        try:
            os.remove(MODEL)
        except Exception:
            pass
    while True:
        print('\n\nEpoch: {}\n'.format(nb_epoch))
        model.fit(X, y, batch_size=BATCH_SIZE, verbose=1, nb_epoch=1)
        nb_epoch += 1
        if nb_epoch == EPOCHS:
            model.save(MODEL, overwrite=True)
            exit()


import websocket
try:
    import thread
except ImportError:
    import _thread as thread
import time

def on_open(ws):
    print('connected to client')

def on_message(ws, message):
    print("received message: " + message)
    split = message.split(" ");
    command = split[0]
    if command == "generate":
        genlen = None
        initx = None
        try:
            genlen = int(split[1])
        except ValueError:
            genlen = 10
        try:
            if split[2] in chars:
                initx = chars.index(split[2])
        except Exception:
            pass
        print("generating " + str(genlen) + " characters")
        gen = generate_text(model, genlen, VOCAB_SIZE, ix_to_char, initx)
        ws.send(gen)

websocket.enableTrace(True)
ws = websocket.WebSocketApp("ws://localhost:3000",
                            on_message = on_message)
ws.on_open = on_open
ws.run_forever()
