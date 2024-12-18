import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { Buffer } from "buffer";

window.Buffer = Buffer;
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const StickyNotesApp = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [ws, setWs] = useState(null);
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [useBlockchain, setUseBlockchain] = useState(true);

  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=41b6dcf4-904b-451d-b2a4-98351135db42");

  const connectWebSocket = () => {
    const newWs = new WebSocket("wss://sticky-notes-backend-production.up.railway.app/ws");
    
    newWs.onopen = () => {
      console.log('WebSocket connected');
      setInterval(() => {
        if (newWs.readyState === WebSocket.OPEN) {
          newWs.send('ping');
        }
      }, 25000);
    };
  
    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'initial') {
          setNotes(data.notes);
        } else {
          setNotes((prevNotes) => {
            const exists = prevNotes.some(note => note.id === data.id);
            if (exists) return prevNotes;
            return [data, ...prevNotes];
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(newWs);
  };

  const connectWallet = async () => {
    try {
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        setWalletAddress(response.publicKey.toString());
      } else {
        alert("Solana wallet not found! Please install Phantom Wallet.");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect();
        setWalletAddress(null);
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const postMessage = async () => {
    if (useBlockchain && !walletAddress) {
      alert("Connect your wallet before posting on-chain.");
      return;
    }

    if (!message) {
      alert("Please enter a message before posting.");
      return;
    }
  
    setIsPosting(true);
    try {
      let signature = null;
      
      if (useBlockchain) {
        const memoInstruction = {
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(message),
        };
    
        const transaction = new Transaction().add(memoInstruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(walletAddress);
    
        const signedTransaction = await window.solana.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature);
      }
  
      await fetch("https://sticky-notes-backend-production.up.railway.app/api/sticky-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message, 
          signature,
          walletAddress: walletAddress || 'anonymous',
          color: selectedColor,
          onChain: useBlockchain
        }),
      });
  
      setMessage("");
    } catch (error) {
      console.error("Error posting message:", error);
      alert("Error posting message. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const fetchStickyNotes = async () => {
    try {
      const response = await fetch("https://sticky-notes-backend-production.up.railway.app/api/sticky-notes");
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error("Error fetching sticky notes:", error);
    }
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.solana && window.solana.isPhantom) {
          const response = await window.solana.connect({ onlyIfTrusted: true });
          setWalletAddress(response.publicKey.toString());
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkWalletConnection();
    fetchStickyNotes();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Solana Sticky Notes</h1>
          <div className="flex justify-center gap-6 text-gray-600">
            <a 
              href="https://x.com/stickynotesgg" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 transition-colors font-medium"
            >
              Twitter
            </a>
            <a 
              href="https://pump.fun/coin/E4Yzu4JeJ59HQgDjzjp4NMyWEwXdW4EXng5qkkWTpump" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 transition-colors font-medium"
            >
              Pump.fun
            </a>
            <a 
              href="https://github.com/StickyNotesGG" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 transition-colors font-medium"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={useBlockchain}
                  onChange={(e) => setUseBlockchain(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span>Post on Solana blockchain</span>
              </label>
              
              {useBlockchain && !walletAddress && (
                <button
                  onClick={connectWallet}
                  className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Connect Wallet
                </button>
              )}
              
              {walletAddress && (
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
              
          <div className="flex gap-2 mb-4">
            <div className="text-sm text-gray-600 mr-2">Choose note color:</div>
            <button
              onClick={() => setSelectedColor('pink')}
              className={`w-6 h-6 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 border-2 transition-all
                ${selectedColor === 'pink' ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`}
            />
            <button
              onClick={() => setSelectedColor('purple')}
              className={`w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 border-2 transition-all
                ${selectedColor === 'purple' ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`}
            />
            <button
              onClick={() => setSelectedColor('blue')}
              className={`w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border-2 transition-all
                ${selectedColor === 'blue' ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`}
            />
            <button
              onClick={() => setSelectedColor('green')}
              className={`w-6 h-6 rounded-full bg-gradient-to-br from-green-100 to-green-200 border-2 transition-all
                ${selectedColor === 'green' ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`}
            />
            <button
              onClick={() => setSelectedColor('yellow')}
              className={`w-6 h-6 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 transition-all
                ${selectedColor === 'yellow' ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`}
            />
          </div>

          <textarea
            rows="4"
            placeholder="Write your message here..."
            value={message}
            onChange={handleInputChange}
            className="w-full p-4 border border-gray-200 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={postMessage}
            disabled={isPosting || !message || (useBlockchain && !walletAddress)}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors
              ${isPosting || !message || (useBlockchain && !walletAddress)
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
          >
            {isPosting ? 'Posting...' : 'Post Sticky Note'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note, index) => (
            <div
              key={note.id || index}
              className="transform transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`bg-gradient-to-br from-${note.color || 'yellow'}-100 to-${note.color || 'yellow'}-200 
                rounded-xl p-6 shadow-md relative backdrop-blur-sm border border-white/50`}>
                <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  {note.walletAddress === 'anonymous' 
                    ? 'Anonymous'
                    : `${note.walletAddress.slice(0, 4)}...${note.walletAddress.slice(-4)}`}
                </div>
                <p className="text-gray-800 mb-4 break-words font-medium">{note.message}</p>
                {note.signature && (
                  <a
                    href={`https://explorer.solana.com/tx/${note.signature}?cluster=mainnet-beta`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-purple-600"></span>
                    View on Solana Explorer
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StickyNotesApp;