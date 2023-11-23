import React, { useEffect, useState } from "react";
import "./App.css";
import { ethers } from "ethers";
import abi from "./utils/WavePortal.json";
import { networks } from './utils/networks';

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
  try {
    const ethereum = getEthereumObject();
    if (!ethereum) {
      console.error("Make sure you have Metamask!");
      return null;
    }

    console.log("We have the Ethereum object", ethereum);
    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      return account;
    } else {
      console.error("No authorized account found");
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const contractAddress = "0xEf25ba77a2Fb8d5bAEC5B920CB6882cbbfE023cc";
  const contractABI = abi.abi;
  const [allWaves, setAllWaves] = useState([]);
  const [network, setNetwork] = useState('');

  const connectWallet = async () => {
    try {
      const ethereum = getEthereumObject();
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.error(error);
    }
  };

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;
    
    if (!ethereum) {
      console.log('Make sure you have MetaMask installed!');
      return;
    }
    try {
      // Get accounts
      const accounts = await ethereum.request({ method: 'eth_accounts' });
    
      if (accounts.length !== 0) {
      const account = accounts[0];
      setCurrentAccount(account);
      } else {
      setCurrentAccount('');
      }

      // Get chainId
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      setNetwork(networks[chainId]);
    
      ethereum.on('chainChanged', handleChainChanged);
    
      function handleChainChanged(_chainId) {
      // Reload the page or update the necessary state when the chain changes
      window.location.reload();
      }
    } catch (error) {
      console.log(error);
      }
    };

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
      // Try to switch to the Mumbai testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
      });
      } catch (error) {
      // This error code means that the chain we want has not been added to MetaMask
      // In this case we ask the user to add it to their MetaMask
      if (error.code === 4902) {
        try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
          {	
            chainId: '0x13881',
            chainName: 'Polygon Mumbai Testnet',
            rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
            nativeCurrency: {
              name: "Mumbai Matic",
              symbol: "MATIC",
              decimals: 18
            },
            blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
          },
          ],
        });
        } catch (error) {
        console.log(error);
        }
      }
      console.log(error);
      }
    } else {
      // If window.ethereum is not found then MetaMask is not installed
      alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
    } 
    }
  
  const wave = async () => {
    try {
      const ethereum = window.ethereum;


      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        const string = prompt("Enter a message");
        const waveTxn = await wavePortalContract.wave(string);

        console.log("Mining...", waveTxn.hash);

        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        
        alert("You have sent a wave!");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
      alert("You have failed to send a wave!");
    }
  }

  const RecentWaves = async () => {
    const { ethereum } = window;
  
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        const waves = await wavePortalContract.getAllWaves();
        
        const last4Waves = waves.slice(-4);

        const wavesCleaned = last4Waves.map(wave => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          };
        });
  
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };
  
  const getAndDisplayAllWaves = async () => {
    await RecentWaves();
  };

  const clearWaves = () => {
    setAllWaves([]);
  };

  useEffect(() => {
    let wavePortalContract;
  
    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };
  
    const initializeContract = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
  
        wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        wavePortalContract.on("NewWave", onNewWave);
      }
    };
  
    (async () => {
      const account = await findMetaMaskAccount();
      if (account !== null) {
        setCurrentAccount(account);
        await initializeContract(); // Initialize contract after getting the account
      }
    })();
  
    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);  

  useEffect(() => {
    const fetchData = async () => {
      const account = await findMetaMaskAccount();
      if (account !== null) {
        setCurrentAccount(account);
      }
    };
  
    fetchData();
  }, []);

  useEffect(() => {
    checkIfWalletIsConnected();
    if (network !== 'Polygon Mumbai Testnet') {
      return (
      <div className="connect-wallet-container">
        <p>Please connect to Polygon Mumbai Testnet</p>
        <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
      </div>)
    }
  }, [network]);
  

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          👋 Hey there!
        </div>
  
        <div className="bio">
          My 1st Blockchain Project - Connect your wallet and wave at me
        </div>
  
        <button className="waveButton" onClick={wave}>
          Wave at Me
        </button>
  
        <button className="waveButton" onClick={getAndDisplayAllWaves}>
          Get Recent Waves
        </button>

        {allWaves.length > 0 && (
          <button className="waveButton" onClick={clearWaves}>
            Clear Waves
          </button>
        )}
  
        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
  
        {allWaves.map((wave, index) => (
          <div key={index} style={{ backgroundColor: "Gray", marginTop: "16px", padding: "8px" }}>
            <div>Address: {wave.address}</div>
            <div>Time: {wave.timestamp.toString()}</div>
            <div>Message: {wave.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;