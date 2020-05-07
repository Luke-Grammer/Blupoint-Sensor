// Include Nodejs' net module.
const net    = require('net')
const yargs  = require('yargs')
const io     = require('socket.io-client')
const noble  = require('@abandonware/noble')
const uuidv4 = require('uuid/v4')
const ca = require('circular-array');


// Initiliaze storage
const signalStrengths = {};
const arrMax = {};
const groupSize = 20;
const weightOnNewData = 0.20;
const lastUpdate = {};

// Initialize constant variables
const argv = yargs
  .option('server', {
    alias: 's',
    description: 'The address of the server',
    type: 'string',
  })
  .option('id', {
    alias: 'i',
    description: 'The id for this sensor',
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .argv

const id = (argv.id) ? argv.id : uuidv4()
const server = (argv.server) ? argv.server : '10.0.0.76:27015'
const client = new net.Socket()

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    //noble.startScanning();
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});

var socket = io.connect(server);

//socket.emit('identify', {
//  id: id
//})

function clearOld() {
  var currTime = new Date();
  for (var key in lastUpdate) {
    var diff = (currTime.getTime() - (lastUpdate[key]).getTime()) / 1000;
    if (diff > 3) {
      delete arrMax[key]
      delete signalStrengths[key]
      delete lastUpdate[key]
    }
  }
  setTimeout(clearOld, 3000);
}
clearOld();


noble.on('discover', function(peripheral) { 
  if (peripheral.advertisement.localName == 'Kontakt') {
    var card = JSON.stringify(peripheral.advertisement.serviceData[0].data.toString('hex'));
    if (signalStrengths[card] == undefined) {
      signalStrengths[card] = new ca.CircularArray(groupSize)	
    }
    signalStrengths[card].push(peripheral.rssi);
    lastUpdate[card] = new Date();
    updateRSSI(weightOnNewData, card)
  }
});


function updateRSSI(weight, cid) {
  if (weight > 1) return -1;
  console.log('\n------------------------')
  max_signal = Math.max.apply(null, signalStrengths[cid].array())
  if (arrMax[cid] != undefined) {
    arrMax[cid] = max_signal * weight + (1 - weight) * arrMax[cid];
  } else {
    arrMax[cid] = max_signal;
  }
  console.log(id + ': ' + arrMax[cid])
  socket.emit('location', {
    id: id,
    card: cid,
    rssi: arrMax[cid],
    time: new Date()
  });

  console.log('------------------------\n')

  return
}

