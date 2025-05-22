import { Box, Container, Heading, Text, Textarea, useToast, VStack } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { parse as parseYaml } from 'yaml';

import { WarpCoreConfig, WarpCoreConfigSchema } from '@hyperlane-xyz/sdk';
import { useStore } from '../features/store';

// Dynamically import ForceGraph to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <Text>Loading visualization...</Text>,
});

const Visualizer = () => {
  const [config, setConfig] = useState<string>('');
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });
  const [chainLogos, setChainLogos] = useState<Map<string, HTMLImageElement>>(new Map());
  const toast = useToast();
  const registry = useStore((s) => s.registry);

  // Pre-render chain logos
  useEffect(() => {
    const loadLogos = async () => {
      const newLogos = new Map<string, HTMLImageElement>();
      for (const node of graphData.nodes) {
        try {
          const metadata = await registry.getChainMetadata(node.chainName);
          if (metadata?.logoURI) {
            const img = new Image();
            img.src = metadata.logoURI;
            await new Promise((resolve) => {
              img.onload = resolve;
            });
            newLogos.set(node.chainName, img);
          }
        } catch (error) {
          console.error(`Failed to load logo for chain ${node.chainName}:`, error);
        }
      }
      setChainLogos(newLogos);
    };
    loadLogos();
  }, [graphData.nodes, registry]);

  const parseConfig = useCallback(
    (input: string) => {
      try {
        // Try parsing as YAML first
        let parsedConfig: unknown;
        try {
          parsedConfig = parseYaml(input);
        } catch {
          // If YAML parsing fails, try JSON
          parsedConfig = JSON.parse(input);
        }

        // Validate with Zod schema
        const result = WarpCoreConfigSchema.safeParse(parsedConfig);
        if (!result.success) {
          throw new Error(result.error.toString());
        }
        const validConfig = result.data as WarpCoreConfig;

        // Transform config into graph data
        // Each token is a node, each connection is a link
        const nodes = validConfig.tokens.map((token) => ({
          id: `${token.chainName}:${token.symbol}`,
          ...token,
          name: `${token.symbol} (${token.chainName})`,
          val: 1,
        }));

        const links: any[] = [];
        validConfig.tokens.forEach((token) => {
          if (token.connections) {
            token.connections.forEach((conn) => {
              let targetChain: string;
              let targetSymbol: string;
              // If conn.token contains '|', parse it to find the correct token
              if (typeof conn.token === 'string' && conn.token.includes('|')) {
                const parts = conn.token.split('|');
                // Try to find the token in the config by chainName and addressOrDenom
                if (parts.length === 3) {
                  const [, chainName, addressOrDenom] = parts;
                  const targetToken = validConfig.tokens.find(
                    (t) => t.chainName === chainName && t.addressOrDenom === addressOrDenom,
                  );
                  targetChain = chainName;
                  targetSymbol = targetToken ? targetToken.symbol : addressOrDenom;
                } else {
                  // Fallback if format is unexpected
                  targetChain = token.chainName;
                  targetSymbol = conn.token;
                }
              } else {
                // Old logic for simple symbol tokens
                if ('intermediateChainName' in conn && conn.intermediateChainName) {
                  targetChain = conn.intermediateChainName;
                } else if ('type' in conn && conn.type === 'ibc' && conn.token) {
                  targetChain = token.chainName;
                } else {
                  targetChain = token.chainName;
                }
                targetSymbol = conn.token;
              }
              const targetId = `${targetChain}:${targetSymbol}`;
              links.push({
                source: `${token.chainName}:${token.symbol}`,
                target: targetId,
                id: `${token.chainName}:${token.symbol}->${targetId}`,
                type: conn.type || 'hyperlane',
              });
            });
          }
        });

        setGraphData({ nodes, links });
      } catch (error) {
        toast({
          title: 'Error parsing config',
          description: error instanceof Error ? error.message : 'Invalid config format',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    },
    [toast],
  );

  const handleConfigChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newConfig = e.target.value;
    setConfig(newConfig);
    if (newConfig.trim()) {
      parseConfig(newConfig);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Warp Route Visualizer</Heading>

        <Box>
          <Text mb={2}>Enter your warp config (JSON or YAML):</Text>
          <Textarea
            value={config}
            onChange={handleConfigChange}
            placeholder="Paste your warp config here..."
            minH="200px"
            fontFamily="monospace"
          />
        </Box>

        <Box borderWidth={1} borderRadius="lg" overflow="hidden" h="600px" bg="white">
          {graphData.nodes.length > 0 ? (
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="symbol"
              nodeAutoColorBy="group"
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = `${node.name || node.symbol}`;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth + 30, fontSize].map((n) => n + fontSize * 0.2); // Added extra width for logo

                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = node.color || '#1a192b';
                ctx.fill();

                // Draw text background
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(
                  node.x - bckgDimensions[0] / 2,
                  node.y + 8,
                  bckgDimensions[0],
                  bckgDimensions[1],
                );

                // Draw chain logo
                const logoSize = fontSize * 1.2;
                const logoX = node.x - bckgDimensions[0] / 2 + logoSize / 2;
                const logoY = node.y + 8 + bckgDimensions[1] / 2;

                const logo = chainLogos.get(node.chainName);
                if (logo) {
                  ctx.drawImage(logo, logoX, logoY - logoSize / 2, logoSize, logoSize);
                }

                // Draw text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000';
                ctx.fillText(
                  label,
                  node.x + logoSize / 2, // Adjust text position to account for logo
                  node.y + 8 + bckgDimensions[1] / 2,
                );
              }}
            />
          ) : (
            <Box h="100%" display="flex" alignItems="center" justifyContent="center">
              <Text color="gray.500">Enter a valid warp config to see the visualization</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  );
};

export default Visualizer;
