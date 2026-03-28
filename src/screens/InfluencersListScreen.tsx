/**
 * Lista todos los influencers dados de alta y permite votar por los que
 * se desea tener una promoción.
 */
import React, { useState, useCallback } from 'react';
import { Box, Text, ScrollView, VStack, Pressable } from '@gluestack-ui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import InfluencerCard from '../components/InfluencerCard';
import { getAllInfluencers, type InfluencerDoc } from '../services/influencersApi';
import { getInfluencerVotes, setInfluencerVote } from '../services/storage';

export default function InfluencersListScreen() {
  const { language } = useSettings();
  const [influencers, setInfluencers] = useState<InfluencerDoc[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [listRes, votes] = await Promise.all([
      getAllInfluencers({ limit: 50 }),
      getInfluencerVotes(),
    ]);
    if (listRes.ok) {
      setInfluencers(listRes.influencers ?? []);
    } else {
      setError(listRes.error ?? 'Error');
      setInfluencers([]);
    }
    setVotedIds(new Set(votes));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleVote = useCallback(async (inf: InfluencerDoc) => {
    const id = inf._id ?? inf.id ?? '';
    if (!id) return;
    const currentlyVoted = votedIds.has(id);
    const nextVoted = !currentlyVoted;
    await setInfluencerVote(id, nextVoted);
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (nextVoted) next.add(id);
      else next.delete(id);
      return next;
    });
  }, [votedIds]);

  const t = {
    title: language === 'es' ? 'Influencers' : 'Influencers',
    subtitle: language === 'es'
      ? 'Vota por los influencers de los que quieres una promoción'
      : 'Vote for influencers you want a promotion from',
    vote: language === 'es' ? 'Quiero su promoción' : 'Want their promotion',
    voted: language === 'es' ? '✓ Votado' : '✓ Voted',
    loading: language === 'es' ? 'Cargando influencers...' : 'Loading influencers...',
    empty: language === 'es' ? 'No hay influencers dados de alta aún' : 'No influencers signed up yet',
    retry: language === 'es' ? 'Reintentar' : 'Retry',
  };

  return (
    <ScrollView flex={1} bg="$backgroundLight50">
      <VStack p="$4" space="md">
        <Box bg="#00704A" borderRadius="$lg" p="$4">
          <Text fontSize="$lg" fontWeight="$bold" color="$white">
            {t.title}
          </Text>
          <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
            {t.subtitle}
          </Text>
        </Box>

        {error && (
          <Box bg="$error100" p="$3" borderRadius="$md">
            <Text color="$error700" fontSize="$sm">{error}</Text>
            <Pressable
              onPress={loadData}
              mt="$2"
              alignSelf="flex-start"
              bg="$white"
              borderWidth={1}
              borderColor="$error500"
              borderRadius="$md"
              px="$4"
              py="$2"
              _pressed={{ opacity: 0.9 }}
            >
              <Text color="$error700" fontSize="$sm" fontWeight="$medium">
                {t.retry}
              </Text>
            </Pressable>
          </Box>
        )}

        {loading ? (
          <Text fontSize="$sm" color="$textLight500" textAlign="center" py="$8">
            {t.loading}
          </Text>
        ) : influencers.length === 0 ? (
          <Text fontSize="$sm" color="$textLight500" textAlign="center" py="$8">
            {t.empty}
          </Text>
        ) : (
          <VStack space="md">
            {influencers.map((inf) => {
              const id = inf._id ?? inf.id ?? '';
              const isVoted = votedIds.has(id);
              return (
                <VStack key={id} space="sm">
                  <Box borderWidth={isVoted ? 2 : 0} borderColor="#00704A" borderRadius="$lg">
                    <InfluencerCard
                      influencer={inf}
                      compact
                      language={language}
                      isVoted={isVoted}
                      voteCount={
                        typeof (inf as { wantPromotionCount?: number }).wantPromotionCount === 'number'
                          ? (inf as { wantPromotionCount: number }).wantPromotionCount
                          : typeof (inf as { voteCount?: number }).voteCount === 'number'
                            ? (inf as { voteCount: number }).voteCount
                            : undefined
                      }
                    />
                  </Box>
                  <Pressable
                    onPress={() => toggleVote(inf)}
                    alignSelf="flex-start"
                    bg={isVoted ? '#00704A' : '$backgroundLight200'}
                    borderRadius="$full"
                    px="$4"
                    py="$2"
                    _pressed={{ opacity: 0.9 }}
                  >
                    <Text
                      fontSize="$sm"
                      fontWeight="$semibold"
                      color={isVoted ? '$white' : '$textLight700'}
                    >
                      {isVoted ? t.voted : t.vote}
                    </Text>
                  </Pressable>
                </VStack>
              );
            })}
          </VStack>
        )}
      </VStack>
    </ScrollView>
  );
}
