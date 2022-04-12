import { ethers } from "ethers";
import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import Image from "next/image";
import styles from "../styles/Home.module.scss";
import { compoundDaiContractABI } from "../utils/compoundDaiContractABI";
import { daiContractABI } from "../utils/daiContractABI";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CDAI_CONTRACT_ADDRESS = "0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD";
const DAI_CONTRACT_ADDRESS = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";

const Home: NextPage = () => {
  const [accountAddress, setAccountAddress] = useState<string>();
  const [daiContract, setDaiContract] = useState<ethers.Contract>();
  const [daiDecimals, setDaiDecimals] = useState<number>();
  const [compoundDaiContract, setCompoundDaiContract] =
    useState<ethers.Contract>();
  const [compoundDaiBalance, setCompoundDaiBalance] = useState<number>();
  const [daiBalance, setDaiBalance] = useState<number>();
  const [accountApproved, setAccountApproved] = useState<boolean>();
  const [inputBalance, setInputBalance] = useState<number>(0);
  const [inputErrorMsg, setInputErrorMsg] = useState<string>();
  const [txHistory, setTxHistory] = useState<any[]>();
  const [pendingTx, setPendingTx] = useState<boolean>();

  const connectWallet = async () => {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      alert("Please install MetaMask");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      const network = await provider.getNetwork();

      if (network.chainId !== 42) {
        alert("Please connect to the Kovan test network");
        return;
      }

      const compoundDaiContract = new ethers.Contract(
        CDAI_CONTRACT_ADDRESS,
        compoundDaiContractABI,
        provider.getSigner()
      );
      setCompoundDaiContract(compoundDaiContract);

      const daiContract = new ethers.Contract(
        DAI_CONTRACT_ADDRESS,
        daiContractABI,
        provider.getSigner()
      );
      setDaiContract(daiContract);

      const accounts = await provider.send("eth_requestAccounts", []);

      accountChangeHandler(accounts[0]);
      await getUserBalances(accounts[0], compoundDaiContract, daiContract);
    } catch (error) {
      console.error(error);
      alert("Please connect with MetaMask");
    }
  };

  const accountChangeHandler = (newAccount: string) => {
    setAccountAddress(newAccount);
  };

  const getUserBalances = async (
    accountAddress: string,
    compoundDaiContract: ethers.Contract,
    daiContract: ethers.Contract
  ) => {
    const cDaiBalance = await compoundDaiContract.balanceOf(accountAddress);
    setCompoundDaiBalance(
      parseFloat(
        ethers.utils.formatUnits(
          cDaiBalance,
          await compoundDaiContract.decimals()
        )
      )
    );

    const daiBalance = await daiContract.balanceOf(accountAddress);
    setDaiBalance(
      parseFloat(
        ethers.utils.formatUnits(daiBalance, await daiContract.decimals())
      )
    );

    const allowance = await daiContract?.allowance(
      accountAddress,
      accountAddress
    );
    setAccountApproved(allowance != 0);

    getTxHistory(accountAddress);
  };

  const getTxHistory = async (accountAddress: string) => {
    if (!accountAddress) return;

    const provider = new ethers.providers.EtherscanProvider("kovan");
    const history = await provider.getHistory(accountAddress);
    setTxHistory(history.filter((tx) => tx.to === CDAI_CONTRACT_ADDRESS));
  };

  const setInputMaxBalance = () => {
    daiBalance && setInputBalance(daiBalance);
  };

  const approveToken = async () => {
    const approveTokenTx = await daiContract?.approve(
      accountAddress,
      ethers.constants.MaxUint256
    );

    setPendingTx(true);
    approveTokenTx?.wait().then(() => {
      getTxHistory(accountAddress as string);
      setPendingTx(false);
      setAccountApproved(true);
    });
  };

  const supplyWithDai = async () => {
    if (!inputBalance || inputBalance <= 0) {
      setInputErrorMsg("Please enter a valid amount");
      return;
    }

    const daiDecimals = await daiContract?.decimals();
    setDaiDecimals(daiDecimals);

    const amount = ethers.utils.parseUnits(
      inputBalance.toString(),
      daiDecimals
    );

    const mintTx = await compoundDaiContract?.mint(amount);

    setPendingTx(true);

    await mintTx?.wait().then(() => {
      getTxHistory(accountAddress as string);
      setPendingTx(false);
    });
  };

  const prettifyText = (text: string) => {
    return text.substring(0, 4) + "..." + text.substring(text.length - 4);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Exactly finance DApp challenge</title>
        <meta name="description" content="Exactly finance DApp challenge" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Exactly finance DApp challenge</h1>

        {!accountAddress ? (
          <p className={styles.description}>
            Please connect your wallet to get started
          </p>
        ) : (
          <p className={styles.description}>
            You are connected. Supply with DAI
          </p>
        )}

        <div className={styles.currencyCard}>
          <span>{compoundDaiBalance}</span>

          <Image src="/cdai.svg" alt="DAI" width={30} height={20} />
          <span className={styles.text}>cDAI</span>
        </div>
        <div className={styles.grid}>
          {!accountAddress ? (
            <button className={styles.button} onClick={connectWallet}>
              <span className={styles.text}>Connect with MetaMask</span>
            </button>
          ) : (
            <>
              <div className={styles.card}>
                {accountApproved ? (
                  <>
                    <div className={styles.inputCard}>
                      <input
                        type={"number"}
                        step={"0.1"}
                        className={styles.input}
                        onChange={(e) =>
                          setInputBalance(parseFloat(e.target.value))
                        }
                        value={inputBalance}
                      />
                      <div className={styles.currencyCard}>
                        <Image
                          src="/dai.svg"
                          alt="DAI"
                          width={30}
                          height={20}
                        />
                        <span className={styles.text}>DAI</span>
                      </div>
                    </div>

                    <div className={styles.balanceCard}>
                      <span className={styles.text}>
                        Balance: {daiBalance ? daiBalance : "-"}
                      </span>
                      <div
                        className={styles.highlighted}
                        onClick={setInputMaxBalance}
                      >
                        max
                      </div>
                    </div>

                    <button
                      className={styles.smallButton}
                      onClick={supplyWithDai}
                    >
                      <span className={styles.text}>Supply with DAI</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      First enable your wallet to spend tokens in our dApp
                    </span>

                    <button
                      className={styles.smallButton}
                      disabled={typeof accountApproved === "undefined"}
                      onClick={approveToken}
                    >
                      <div className={styles.text}>Enable</div>
                    </button>
                  </>
                )}

                <span className={styles.error}>{inputErrorMsg}</span>
                {pendingTx ? (
                  <span className={styles.text}>Tx pending...</span>
                ) : null}
              </div>

              {txHistory && txHistory.length > 0 ? (
                <div className={styles.historyCard}>
                  <table>
                    <tr>
                      <th>Hash</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Value</th>
                    </tr>
                    {txHistory.map((tx, index) => (
                      <tr key={index}>
                        <th className={styles.text}>{prettifyText(tx.hash)}</th>
                        <th className={styles.text}>{prettifyText(tx.from)}</th>
                        <th className={styles.text}>{prettifyText(tx.to)}</th>
                        <th className={styles.text}>
                          {ethers.utils.formatUnits(tx.value, daiDecimals)}
                        </th>
                      </tr>
                    ))}
                  </table>
                </div>
              ) : (
                <span className={styles.grayText}>No TX registered</span>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
