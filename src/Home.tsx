import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Box, Button, CircularProgress, Snackbar, Typography } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import eye from './media/eye.png'
import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";
import { withStyles } from "@material-ui/styles";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

// const MintButton = styled(Button)`background: #6163ff; color: white`; // add your styles here

const MintButton = withStyles({
  // root: {
  //   background: '#6163ff',
  //   color: 'white'
  // }
})(Button)

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [remainingCount, setRemainingCount] = useState(0)
  const [redeemdedCount, setRedeemedCount] = useState(0)
  const [availableCount, setAvailableCount] = useState(0)
  
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });

          loadCandyMachineState()
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  const loadCandyMachineState = async () => {
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;

    const { candyMachine, goLiveDate, itemsRemaining, itemsRedeemed, itemsAvailable } =
      await getCandyMachineState(
        anchorWallet,
        props.candyMachineId,
        props.connection
      );

    setRemainingCount(itemsRemaining)
    setRedeemedCount(itemsRedeemed)
    setAvailableCount(itemsAvailable)

    setIsSoldOut(itemsRemaining === 0);
    setStartDate(goLiveDate);
    setCandyMachine(candyMachine);
  };

  useEffect(() => {
    (async () => {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }

      loadCandyMachineState()
    })();
  }, [wallet, props.candyMachineId, props.connection]);

  const containerStyles = {
    display: 'flex',
    flexDirection: 'column' as any,
    justifyContent: 'space-evenly',
    alignItems: 'center',

  }

  return (
    <main style={containerStyles}>
      {/* {wallet.connected && 
      <>
        <p>Address: {shortenAddress(wallet.publicKey?.toBase58() || "")}</p>
        <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
      </>  
      } */}
      
      <div style={{display: 'flex', flexDirection: 'row', marginBottom: '5px'}}>
        <h1 style={{color: 'white', fontSize: '42px', marginBottom: '5px', marginTop: '5px'}}>Heroy</h1>
        <h1 style={{color: '#5658dd', fontSize: '42px', marginBottom: '5px',  marginTop: '5px'}}>Demon Punks</h1>
      </div>

      <h3 style={{color: '#9ca9b3', marginBottom: '20px'}}>100 Demon Punks on the Solana blockchain.</h3>

      {!wallet.connected && <ConnectButton>Connect Wallet</ConnectButton> }

      {wallet.connected &&
        <Box marginBottom={2}>
          <Typography variant="body1" style={{ color: '#9ca9b3' }}>Remained {remainingCount} of {availableCount} NFTs</Typography>
        </Box>
    }

      <MintContainer>
        {wallet.connected && 
        <MintButton
          color="primary"
          disabled={isSoldOut || isMinting || !isActive}
          onClick={onMint}
          variant="contained"
        >
          {isSoldOut ? (
            "SOLD OUT"
            ) : isActive ? (
              isMinting ? (
                <CircularProgress />
                ) : (
                  "MINT"
                  )
                  ) : (
                    <Countdown
                    date={startDate}
                    onMount={({ completed }) => completed && setIsActive(true)}
                    onComplete={() => setIsActive(true)}
                    renderer={renderCounter}
                    />
                    )}
        </MintButton>
        }
      </MintContainer>

      <img src={eye} style={{ width: '300px', marginTop: '20px' }} alt="Heroy" />
      
      <Box textAlign="center" marginTop={3}>
        <Typography variant="caption" style={{ color: '#9ca9b3' }}>Powered by <strong>Heroy</strong></Typography>
      </Box>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
