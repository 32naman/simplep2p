import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

function App() {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callee, setCallee] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [partner, setPartner] = useState(null);
  const userData = useRef();
  const partnerData = useRef();
  const socket = useRef();

  useEffect(() => {
    socket.current = io.connect("/");

    socket.current.on("yourID", (id) => {
      setYourID(id);
    });
    socket.current.on("allUsers", (users) => {
      setUsers(users);
    });

    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  function callPeer(id) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
    });
    peer.on("signal", (data) => {
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID,
      });
    });

    peer.on("connect", () => {
      if (partnerData.current)
        partnerData.current.value = "connection established";
    });

    peer.on("data", (data) => {
      if (data == "terminate") {
        end();
      } else partnerData.current.value = data;
    });

    socket.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      setCallee(id);
      peer.signal(signal);
      setPartner(peer);
    });
  }

  function acceptCall() {
    setCallAccepted(true);
    setReceivingCall(false);
    const peer = new Peer({
      initiator: false,
      trickle: false,
    });

    setPartner(peer);

    peer.on("signal", (data) => {
      socket.current.emit("acceptCall", { signal: data, to: caller });
    });

    peer.on("connect", () => {
      if (partnerData.current)
        partnerData.current.value = "connection established";
    });

    peer.on("data", (data) => {
      if (data == "terminate") {
        end();
      } else partnerData.current.value = data;
    });

    peer.signal(callerSignal);
  }

  function end() {
    if (partner != null) {
      partner.send("terminate");
      partner.destroy();
    }
    if (partnerData.current) partnerData.current.value = "connection closed";
    setCallee("");
    setCaller("");
    setPartner(null);
    setCallerSignal();
    setCallAccepted(false);
    if (partnerData.current) partnerData.current.value = "";
  }

  let UserData;
  UserData = (
    <div>
      <input type="text" ref={userData} />
      <button
        type="button"
        onClick={() => {
          if (partner != null) partner.send(userData.current.value);
          userData.current.value = "";
        }}
      >
        send
      </button>
    </div>
  );

  let PartnerData;
  if (callAccepted) {
    PartnerData = <input type="text" ref={partnerData} value="" />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
      </div>
    );
  }
  let endCall;
  if (callAccepted) {
    endCall = <button onClick={end}>end</button>;
  }
  return (
    <Container>
      <Row>
        {UserData}
        {PartnerData}
      </Row>
      <Row>
        {Object.keys(users).map((key) => {
          if (key === yourID) {
            return null;
          }
          return <button onClick={() => callPeer(key)}>Call {key}</button>;
        })}
      </Row>
      <Row>{incomingCall}</Row>
      <Row>{endCall}</Row>
    </Container>
  );
}

export default App;
