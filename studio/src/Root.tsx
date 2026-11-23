import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { PisaShort, PISA_FRAMES } from "./videos/pisa/Pisa";
import { WalkieShort, WALKIE_FRAMES } from "./videos/walkie/Walkie";
import { Avatar } from "./videos/avatar/Avatar";
import { Banner } from "./videos/avatar/Banner";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WalkieShort" component={WalkieShort} durationInFrames={WALKIE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ChannelAvatar" component={Avatar} durationInFrames={1} fps={30} width={1080} height={1080} />
    <Composition id="ChannelBanner" component={Banner} durationInFrames={1} fps={30} width={2560} height={1440} />
    <Composition id="PisaShort" component={PisaShort} durationInFrames={PISA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
